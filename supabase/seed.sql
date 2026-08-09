-- ============================================================================
-- Seed data — run after the 4 migrations. Safe to re-run (upserts by
-- natural key: products by sku, targets by the unique scope index).
--
-- This only covers data with NO dependency on real user accounts:
-- products and company-wide targets. Individual (per-rep) targets,
-- appointments, quotations, deals, and invoices all require real
-- profiles(id) rows, which don't exist until people actually sign up —
-- see supabase/README.md.
-- ============================================================================

insert into public.products (name, sku, category, brand, price, status, description)
values
  ('PPR Pressure Pipe & Fitting System — DN20–110', 'PIM-PPR-2011', 'Drinking Water Systems', 'Pimtas', 1450, 'active', 'Cold and hot water PPR pressure pipes and fittings for indoor and outdoor potable water networks.'),
  ('CPVC Hot & Cold Water Pipe Set', 'PLM-CPVC-100', 'Drinking Water Systems', 'Polymelt', 980, 'active', 'CPVC piping system rated for hot and cold potable water distribution.'),
  ('PVC-U Drainage Pipe & Fitting Range', 'PLP-PVC-DR40', 'Sewage & Drainage Systems', 'Poloplast', 760, 'active', 'Primary and secondary network drainage pipes and fittings for sewage systems.'),
  ('Sewage Network Manhole & Access Fitting Kit', 'NAS-SWG-MH1', 'Sewage & Drainage Systems', 'NASSAR', 540, 'draft', 'Manhole connectors and access fittings for buried sewage networks.'),
  ('Wall-Hung Ceramic Basin & WC Suite', 'SCR-SAN-WC12', 'Sanitary Ware', 'Saudi Ceramics', 610, 'active', 'Wall-hung ceramic basin and WC suite for residential and commercial bathrooms.'),
  ('Designer Bath & Shower Fixture Set', 'QTB-FIX-450', 'Sanitary Ware', 'Quarterbath', 890, 'active', 'Mixer taps, shower sets, and bathroom fixtures in a coordinated finish.'),
  ('Sink & Faucet Fitting Range', 'ALV-SNK-220', 'Sanitary Ware', 'Alvit', 310, 'draft', 'Kitchen and utility sinks with matching faucet fittings.'),
  ('Galvanized Steel Threaded Pipe', 'TRN-GST-150', 'Galvanized Steel Pipes', 'Turan', 1120, 'active', 'Hot-dip galvanized steel pipe with threaded ends for structural and plumbing use.'),
  ('Structural Galvanized Fitting Set', 'NAS-GST-FIT', 'Galvanized Steel Pipes', 'NASSAR', 475, 'active', 'Elbows, tees, and couplings for galvanized steel pipe assemblies.'),
  ('Industrial Pipeline Valve & Coupling System', 'GF-IND-VLV9', 'Infrastructure Pipeline Solutions', '+GF+ (Georg Fischer)', 3250, 'active', 'Valves and couplings engineered for municipal and industrial buried pipeline networks.'),
  ('Agricultural Irrigation Pipeline Kit', 'PLP-AGR-IRR', 'Infrastructure Pipeline Solutions', 'Poloplast', 1680, 'draft', 'Buried pipeline components for agricultural irrigation networks.'),
  ('Electrofusion Welding Machine', 'GF-TL-EF160', 'Tools & Equipment', '+GF+ (Georg Fischer)', 4800, 'active', 'Electrofusion fusion machine for joining PE and PP pipe systems on-site.'),
  ('Booster Pump Set', 'DAB-PMP-B2', 'Tools & Equipment', 'DAB Pumps', 1340, 'active', 'Pressure booster pump set for residential and light commercial water supply.'),
  ('Polyethylene Water Storage Tank — 2,000L', 'AQP-TNK-2000', 'Water Storage Tanks', 'Aquapa', 890, 'active', 'Rotomolded polyethylene water storage tank for rooftop or ground installation.'),
  ('Stainless Steel Panel Water Tank', 'GRI-TNK-SS15', 'Water Storage Tanks', 'Guaari', 2150, 'archived', 'Stainless steel panel water tank, replaced by the Aquapa rotomolded range.'),
  ('UPVC Pressure Pipe System — Class D', 'PLM-UPVC-300', 'Drinking Water Systems', 'Polymelt', 720, 'active', 'UPVC pressure pipe system for cold water supply and irrigation networks.'),
  ('Soundproof Drainage Pipe System', 'PLP-SND-DR60', 'Sewage & Drainage Systems', 'Poloplast', 890, 'active', 'Low-noise mineral-reinforced drainage pipes for multi-story buildings.'),
  ('Pedestal Wash Basin Set', 'SCR-SAN-PED8', 'Sanitary Ware', 'Saudi Ceramics', 340, 'active', 'Freestanding pedestal wash basin with matching fittings.'),
  ('One-Piece Floor-Mounted WC', 'SCR-SAN-WC20', 'Sanitary Ware', 'Saudi Ceramics', 480, 'active', 'Compact one-piece toilet with dual-flush cistern.'),
  ('Actuated Butterfly Valve — DN50-300', 'GF-IND-BFV5', 'Infrastructure Pipeline Solutions', '+GF+ (Georg Fischer)', 2100, 'active', 'Electrically actuated butterfly valve for municipal water and industrial process lines.'),
  ('Pipe Fusion Jointing Tool Kit', 'GF-TL-JNT30', 'Tools & Equipment', '+GF+ (Georg Fischer)', 1250, 'active', 'Hand tool kit for socket and butt fusion jointing of PE and PP pipe.'),
  ('PP-R Fitting Assortment Box', 'PIM-PPR-FIT1', 'Drinking Water Systems', 'Pimtas', 260, 'active', 'Mixed box of elbows, tees, and couplings for PP-R pressure systems.'),
  ('Submersible Drainage Pump', 'DAB-PMP-SUB4', 'Tools & Equipment', 'DAB Pumps', 610, 'active', 'Submersible pump for dewatering and drainage of wastewater pits.'),
  ('Domestic Circulator Pump', 'DAB-PMP-CIR2', 'Tools & Equipment', 'DAB Pumps', 285, 'draft', 'Wet-rotor circulator pump for domestic heating and hot water systems.'),
  ('Polyethylene Water Storage Tank — 5,000L', 'AQP-TNK-5000', 'Water Storage Tanks', 'Aquapa', 1620, 'active', 'Large-capacity rotomolded tank for ground-level water storage.'),
  ('Angle Valve & Flexible Hose Set', 'ALV-VLV-ANG3', 'Sanitary Ware', 'Alvit', 95, 'active', 'Chrome angle valves with braided flexible hoses for basins and WCs.'),
  ('Rain Shower Panel System', 'QTB-SHW-RAIN', 'Sanitary Ware', 'Quarterbath', 1150, 'active', 'Wall-mounted shower panel with rain head, hand shower, and body jets.'),
  ('Galvanized Steel Pipe — Plain End', 'TRN-GST-PE100', 'Galvanized Steel Pipes', 'Turan', 890, 'active', 'Hot-dip galvanized steel pipe with plain ends for welded assemblies.'),
  ('Galvanized Flange & Gasket Set', 'NAS-GST-FLG2', 'Galvanized Steel Pipes', 'NASSAR', 210, 'draft', 'Galvanized steel flanges with matching gaskets and bolt sets.'),
  ('GRP Sectional Water Tank', 'GRI-TNK-GRP10', 'Water Storage Tanks', 'Guaari', 3400, 'active', 'Glass-reinforced-plastic sectional tank assembled on-site for large storage volumes.')
on conflict (sku) do update set
  name = excluded.name,
  category = excluded.category,
  brand = excluded.brand,
  price = excluded.price,
  status = excluded.status,
  description = excluded.description;

-- Company-wide targets for the current year (adjust the year/month/amounts
-- to match your actual goals — these mirror the app's previous mock data).
insert into public.targets (target_type, period_type, amount, year, month)
values
  ('company', 'yearly', 3000000, 2026, null),
  ('company', 'monthly', 350000, 2026, 8)
on conflict (
  target_type,
  period_type,
  coalesce(salesperson_id, '00000000-0000-0000-0000-000000000000'::uuid),
  year,
  coalesce(month, 0)
) do update set amount = excluded.amount;
