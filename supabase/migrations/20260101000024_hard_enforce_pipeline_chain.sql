-- Hard-enforce the Appointment -> Quotation -> Deal -> Invoice chain.
-- Every stage must reference a real parent record; on delete restrict
-- replaces on delete set null since a NOT NULL column can't be nulled out.
-- Test/seed data only at this point, so no backfill step is needed.

-- appointments: close the loophole at the root of the chain
alter table public.appointments alter column customer_id set not null;
alter table public.appointments
  drop constraint appointments_customer_id_fkey,
  add constraint appointments_customer_id_fkey
    foreign key (customer_id) references public.customers (id) on delete restrict;

-- quotations: must reference a real appointment (and its customer)
alter table public.quotations
  alter column appointment_id set not null,
  alter column customer_id set not null;
alter table public.quotations
  drop constraint quotations_appointment_id_fkey,
  add constraint quotations_appointment_id_fkey
    foreign key (appointment_id) references public.appointments (id) on delete restrict;
alter table public.quotations
  drop constraint quotations_customer_id_fkey,
  add constraint quotations_customer_id_fkey
    foreign key (customer_id) references public.customers (id) on delete restrict;

-- deals: must reference a real quotation (and its customer)
alter table public.deals
  alter column quotation_id set not null,
  alter column customer_id set not null;
alter table public.deals
  drop constraint deals_quotation_id_fkey,
  add constraint deals_quotation_id_fkey
    foreign key (quotation_id) references public.quotations (id) on delete restrict;
alter table public.deals
  drop constraint deals_customer_id_fkey,
  add constraint deals_customer_id_fkey
    foreign key (customer_id) references public.customers (id) on delete restrict;

-- invoices: must reference a real deal (and its customer)
alter table public.invoices
  alter column deal_id set not null,
  alter column customer_id set not null;
alter table public.invoices
  drop constraint invoices_deal_id_fkey,
  add constraint invoices_deal_id_fkey
    foreign key (deal_id) references public.deals (id) on delete restrict;
alter table public.invoices
  drop constraint invoices_customer_id_fkey,
  add constraint invoices_customer_id_fkey
    foreign key (customer_id) references public.customers (id) on delete restrict;
