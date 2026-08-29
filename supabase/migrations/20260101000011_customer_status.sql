-- customers.status — active/prospect/inactive, shown and filtered on /customers.
-- The rest of the customers table (name, company, email, phone, address,
-- owner_id) already existed; status was tracked only in the frontend's mock
-- data until now.

create type public.customer_status as enum ('active', 'prospect', 'inactive');

alter table public.customers
  add column status public.customer_status not null default 'prospect';
