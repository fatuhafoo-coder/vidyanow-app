-- Run this whole file once in Supabase > SQL Editor.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('student','tutor','admin')),
  name text, email text, phone text,
  classes text[] default '{}', docs jsonb default '{}',
  approved boolean default false, online boolean default false,
  created_at timestamptz default now()
);
create table settings (key text primary key, value jsonb not null);
create table bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  tutor_id uuid references profiles(id),
  class text not null, subjects text[] not null, topic text,
  hours numeric not null, address text not null,
  price int not null, payout int not null,
  status text not null default 'searching' check (status in ('searching','enroute','in_class','completed','cancelled')),
  created_at timestamptz default now(), started_at timestamptz, ended_at timestamptz
);
-- OTPs live in their own table so only the student can read them
create table booking_otps (booking_id uuid primary key references bookings on delete cascade, start_otp text not null, end_otp text not null);

create function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function is_approved_tutor() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='tutor' and approved) $$;

create function make_otps() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into booking_otps values (new.id, lpad(floor(random()*10000)::text,4,'0'), lpad(floor(random()*10000)::text,4,'0')); return new; end $$;
create trigger t_otps after insert on bookings for each row execute function make_otps();

-- users can never change their own role or approval
create function protect_profile() returns trigger language plpgsql security definer set search_path=public as
$$ begin if auth.uid() is not null and not is_admin() then new.role:=old.role; new.approved:=old.approved; end if; return new; end $$;
create trigger t_protect before update on profiles for each row execute function protect_profile();

alter table profiles enable row level security;
alter table settings enable row level security;
alter table bookings enable row level security;
alter table booking_otps enable row level security;

create policy p_sel on profiles for select using (id=auth.uid() or is_admin()
  or id in (select tutor_id from bookings where student_id=auth.uid())
  or id in (select student_id from bookings where tutor_id=auth.uid()));
create policy p_ins on profiles for insert with check (id=auth.uid() and role in ('student','tutor'));
create policy p_upd on profiles for update using (id=auth.uid() or is_admin());

create policy s_sel on settings for select to authenticated using (true);
create policy s_all on settings for all using (is_admin()) with check (is_admin());

create policy b_sel on bookings for select using (student_id=auth.uid() or tutor_id=auth.uid() or is_admin()
  or (status='searching' and is_approved_tutor()));
create policy b_ins on bookings for insert with check (student_id=auth.uid());

create policy o_sel on booking_otps for select using (exists (select 1 from bookings b where b.id=booking_id and b.student_id=auth.uid()));

create function accept_booking(bid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_approved_tutor() then raise exception 'Your account is not approved yet'; end if;
  update bookings set tutor_id=auth.uid(), status='enroute' where id=bid and status='searching';
  if not found then raise exception 'Another tutor already took this job'; end if;
end $$;

create function cancel_booking(bid uuid) returns void language sql security definer set search_path=public as
$$ update bookings set status='cancelled' where id=bid and student_id=auth.uid() and status='searching' $$;

create function verify_otp(bid uuid, code text, phase text) returns void language plpgsql security definer set search_path=public as $$
begin
  if phase='start' then
    update bookings b set status='in_class', started_at=now() from booking_otps o
      where b.id=bid and o.booking_id=b.id and b.tutor_id=auth.uid() and b.status='enroute' and o.start_otp=code;
  else
    update bookings b set status='completed', ended_at=now() from booking_otps o
      where b.id=bid and o.booking_id=b.id and b.tutor_id=auth.uid() and b.status='in_class' and o.end_otp=code;
  end if;
  if not found then raise exception 'Wrong code'; end if;
end $$;

alter publication supabase_realtime add table bookings;

-- private bucket for Govt ID / degree / selfie uploads
insert into storage.buckets (id, name, public) values ('kyc','kyc',false) on conflict do nothing;
create policy kyc_rw on storage.objects for all to authenticated
  using (bucket_id='kyc' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()))
  with check (bucket_id='kyc' and (storage.foldername(name))[1]=auth.uid()::text);
