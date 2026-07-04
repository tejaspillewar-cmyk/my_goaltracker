-- Add days-of-week column to reminders
-- days is an array of integers: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
-- Default is all days (fires every day)
alter table public.reminders
  add column if not exists days smallint[] not null default '{0,1,2,3,4,5,6}';
