--
-- PostgreSQL database dump
--

\restrict mOqqQ60dmRILoR3Svog3gJR3QymMw2JlhY4t3HFlJUt9AWfxVfKmcUPsWa0ZEwy

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: fn_recalculate_rental_cost(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_recalculate_rental_cost() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_days  INT;
  v_total NUMERIC;
BEGIN
  IF NEW.event_date IS DISTINCT FROM OLD.event_date OR
     NEW.rental_end_date IS DISTINCT FROM OLD.rental_end_date THEN

    v_days := GREATEST(1, (NEW.rental_end_date - NEW.event_date)::INT);

    SELECT COALESCE(SUM(rental_price_per_day * quantity), 0) * v_days
    INTO v_total
    FROM rental_items
    WHERE rental_id = NEW.id;

    NEW.total_rental_cost := v_total;
  END IF;

  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    filename text NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: capital_investments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capital_investments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric(12,2) NOT NULL,
    category character varying(50) NOT NULL,
    note text,
    invested_at date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    payroll_record_id uuid,
    CONSTRAINT capital_investments_category_check CHECK (((category)::text = ANY (ARRAY[('stock_purchase'::character varying)::text, ('equipment'::character varying)::text, ('rent'::character varying)::text, ('utilities'::character varying)::text, ('salaries'::character varying)::text, ('other'::character varying)::text, ('owner_contribution'::character varying)::text])))
);


--
-- Name: cash_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    opening_balance numeric(12,2) DEFAULT 0 NOT NULL,
    closing_balance numeric(12,2),
    notes text,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    cashout_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT cash_sessions_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('closed'::character varying)::text])))
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50),
    whatsapp character varying(50),
    email character varying(255),
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    department character varying(100),
    designation character varying(100),
    base_salary numeric(12,2) DEFAULT 0,
    join_date date,
    address text,
    emergency_contact character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fine_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fine_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid NOT NULL,
    days_late integer NOT NULL,
    fine_per_day numeric(10,2) NOT NULL,
    total_fine numeric(10,2) NOT NULL,
    is_paid boolean DEFAULT false,
    paid_at timestamp with time zone,
    paid_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_variant_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    quantity integer NOT NULL,
    reason text,
    reference_id uuid,
    reference_type character varying(50),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_movements_type_check CHECK (((type)::text = ANY (ARRAY[('in'::character varying)::text, ('out'::character varying)::text, ('return'::character varying)::text, ('damage'::character varying)::text, ('adjustment'::character varying)::text, ('rental_out'::character varying)::text, ('rental_return'::character varying)::text])))
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT leave_requests_leave_type_check CHECK (((leave_type)::text = ANY (ARRAY[('annual'::character varying)::text, ('sick'::character varying)::text, ('casual'::character varying)::text, ('unpaid'::character varying)::text]))),
    CONSTRAINT leave_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid,
    customer_id uuid,
    type character varying(100) NOT NULL,
    channel character varying(50) NOT NULL,
    recipient character varying(255),
    message text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_logs_channel_check CHECK (((channel)::text = ANY (ARRAY[('sms'::character varying)::text, ('whatsapp'::character varying)::text, ('email'::character varying)::text, ('system'::character varying)::text]))),
    CONSTRAINT notification_logs_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid,
    sale_id uuid,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50) DEFAULT 'cash'::character varying NOT NULL,
    payment_type character varying(50) NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payroll_allowances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_allowances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_record_id uuid NOT NULL,
    label character varying(100) NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    period_month date NOT NULL,
    base_salary numeric(12,2) DEFAULT 0 NOT NULL,
    allowances numeric(12,2) DEFAULT 0,
    deductions numeric(12,2) DEFAULT 0,
    net_pay numeric(12,2) DEFAULT 0,
    status character varying(20) DEFAULT 'draft'::character varying,
    paid_at timestamp with time zone,
    processed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payroll_records_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('processed'::character varying)::text, ('paid'::character varying)::text])))
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    url text NOT NULL,
    is_primary boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku character varying(100) NOT NULL,
    size character varying(50),
    color character varying(50),
    material character varying(100),
    selling_price numeric(10,2),
    rental_price_per_day numeric(10,2),
    stock_quantity integer DEFAULT 0,
    available_for_rent integer DEFAULT 0,
    damaged_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    label_id integer NOT NULL
);


--
-- Name: product_variants_label_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_variants_label_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_variants_label_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_variants_label_id_seq OWNED BY public.product_variants.label_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category_id uuid,
    sku character varying(100) NOT NULL,
    barcode character varying(100),
    type character varying(50) DEFAULT 'both'::character varying NOT NULL,
    selling_price numeric(10,2),
    rental_price_per_day numeric(10,2),
    late_fine_per_day numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT products_type_check CHECK (((type)::text = ANY (ARRAY[('rental'::character varying)::text, ('sale'::character varying)::text, ('both'::character varying)::text])))
);


--
-- Name: promotion_code_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_code_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promotion_code_id uuid NOT NULL,
    sale_id uuid,
    rental_id uuid,
    discount_amount numeric(10,2) NOT NULL,
    used_by uuid,
    used_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_code_usage_has_ref CHECK (((sale_id IS NOT NULL) OR (rental_id IS NOT NULL)))
);


--
-- Name: promotion_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    scope character varying(20) DEFAULT 'both'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT promotion_codes_discount_type_check CHECK (((discount_type)::text = ANY (ARRAY[('percentage'::character varying)::text, ('flat_amount'::character varying)::text]))),
    CONSTRAINT promotion_codes_discount_value_check CHECK ((discount_value > (0)::numeric)),
    CONSTRAINT promotion_codes_scope_check CHECK (((scope)::text = ANY (ARRAY[('pos'::character varying)::text, ('rental'::character varying)::text, ('both'::character varying)::text])))
);


--
-- Name: promotion_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promotion_id uuid NOT NULL,
    sale_id uuid,
    rental_id uuid,
    discount_amount numeric(10,2) NOT NULL,
    used_by uuid,
    used_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_usage_has_ref CHECK (((sale_id IS NOT NULL) OR (rental_id IS NOT NULL)))
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    scope character varying(20) DEFAULT 'both'::character varying NOT NULL,
    percentage_value numeric(5,2),
    flat_amount_value numeric(10,2),
    buy_quantity integer,
    get_quantity integer,
    free_variant_id uuid,
    min_order_amount numeric(10,2),
    max_usage_count integer,
    usage_count integer DEFAULT 0 NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT promotions_scope_check CHECK (((scope)::text = ANY (ARRAY[('pos'::character varying)::text, ('rental'::character varying)::text, ('both'::character varying)::text]))),
    CONSTRAINT promotions_type_check CHECK (((type)::text = ANY (ARRAY[('percentage'::character varying)::text, ('flat_amount'::character varying)::text, ('buy_x_get_y'::character varying)::text, ('free_item'::character varying)::text])))
);


--
-- Name: rental_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rental_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rental_id uuid NOT NULL,
    product_variant_id uuid NOT NULL,
    quantity integer DEFAULT 1,
    rental_price_per_day numeric(10,2) NOT NULL,
    is_returned boolean DEFAULT false,
    return_condition character varying(50),
    returned_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    damage_remark text,
    CONSTRAINT rental_items_return_condition_check CHECK (((return_condition)::text = ANY (ARRAY[('good'::character varying)::text, ('damaged'::character varying)::text, ('lost'::character varying)::text])))
);


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rentals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_number character varying(50) NOT NULL,
    customer_id uuid NOT NULL,
    status character varying(50) DEFAULT 'reserved'::character varying NOT NULL,
    rental_start_date date NOT NULL,
    rental_end_date date NOT NULL,
    actual_return_date date,
    advance_payment numeric(10,2) DEFAULT 0,
    total_rental_cost numeric(10,2) DEFAULT 0,
    total_fine numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    notes text,
    event_type character varying(100),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    security_type character varying(20),
    security_deposit numeric(10,2) DEFAULT 0,
    security_id_number character varying(100),
    event_date date,
    CONSTRAINT rentals_security_type_check CHECK (((security_type)::text = ANY (ARRAY[('deposit'::character varying)::text, ('id_card'::character varying)::text]))),
    CONSTRAINT rentals_status_check CHECK (((status)::text = ANY (ARRAY[('reserved'::character varying)::text, ('ready_for_pickup'::character varying)::text, ('picked_up'::character varying)::text, ('returned'::character varying)::text, ('late_return'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role character varying(50) NOT NULL,
    module character varying(100) NOT NULL,
    can_read boolean DEFAULT false,
    can_write boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    product_variant_id uuid NOT NULL,
    product_name character varying(255),
    variant_info character varying(255),
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0,
    subtotal numeric(10,2) NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_number character varying(50) NOT NULL,
    customer_id uuid,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0,
    change_amount numeric(10,2) DEFAULT 0,
    payment_method character varying(50) DEFAULT 'cash'::character varying,
    status character varying(50) DEFAULT 'completed'::character varying,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    invoice_pdf_path character varying(500),
    CONSTRAINT sales_payment_method_check CHECK (((payment_method)::text = ANY (ARRAY[('cash'::character varying)::text, ('card'::character varying)::text, ('mobile_payment'::character varying)::text, ('bank_transfer'::character varying)::text, ('mixed'::character varying)::text]))),
    CONSTRAINT sales_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('refunded'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    label character varying(255),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'cashier'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    avatar_url character varying(500),
    phone character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('super_admin'::character varying)::text, ('manager'::character varying)::text, ('cashier'::character varying)::text, ('inventory_staff'::character varying)::text])))
);


--
-- Name: website_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: website_contact_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    subject character varying(255),
    message text NOT NULL,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT website_contact_submissions_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'read'::character varying])::text[])))
);


--
-- Name: website_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: website_promotion_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_promotion_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    website_promotion_id uuid NOT NULL,
    sale_id uuid,
    rental_id uuid,
    discount_amount numeric(10,2) NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_website_usage_has_ref CHECK (((sale_id IS NOT NULL) OR (rental_id IS NOT NULL)))
);


--
-- Name: website_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    banner_image text,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    scope character varying(20) DEFAULT 'both'::character varying NOT NULL,
    category_ids uuid[],
    weekend_only boolean DEFAULT false NOT NULL,
    min_order_amount numeric(10,2),
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT website_promotions_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percentage'::character varying, 'flat_amount'::character varying])::text[]))),
    CONSTRAINT website_promotions_discount_value_check CHECK ((discount_value > (0)::numeric)),
    CONSTRAINT website_promotions_scope_check CHECK (((scope)::text = ANY ((ARRAY['sale'::character varying, 'rental'::character varying, 'both'::character varying])::text[])))
);


--
-- Name: product_variants label_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants ALTER COLUMN label_id SET DEFAULT nextval('public.product_variants_label_id_seq'::regclass);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (filename);


--
-- Name: capital_investments capital_investments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_investments
    ADD CONSTRAINT capital_investments_pkey PRIMARY KEY (id);


--
-- Name: cash_sessions cash_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: employee_profiles employee_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_pkey PRIMARY KEY (id);


--
-- Name: employee_profiles employee_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_user_id_key UNIQUE (user_id);


--
-- Name: fine_transactions fine_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fine_transactions
    ADD CONSTRAINT fine_transactions_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payroll_allowances payroll_allowances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_allowances
    ADD CONSTRAINT payroll_allowances_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_employee_id_period_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_period_month_key UNIQUE (employee_id, period_month);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_slug_key UNIQUE (slug);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_barcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_barcode_key UNIQUE (barcode);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: promotion_code_usages promotion_code_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_code_usages
    ADD CONSTRAINT promotion_code_usages_pkey PRIMARY KEY (id);


--
-- Name: promotion_codes promotion_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_codes
    ADD CONSTRAINT promotion_codes_code_key UNIQUE (code);


--
-- Name: promotion_codes promotion_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_codes
    ADD CONSTRAINT promotion_codes_pkey PRIMARY KEY (id);


--
-- Name: promotion_usages promotion_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usages
    ADD CONSTRAINT promotion_usages_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: rental_items rental_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_booking_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_booking_number_key UNIQUE (booking_number);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role, module);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sales sales_sale_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_sale_number_key UNIQUE (sale_number);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: website_admins website_admins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_admins
    ADD CONSTRAINT website_admins_email_key UNIQUE (email);


--
-- Name: website_admins website_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_admins
    ADD CONSTRAINT website_admins_pkey PRIMARY KEY (id);


--
-- Name: website_contact_submissions website_contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_contact_submissions
    ADD CONSTRAINT website_contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: website_customers website_customers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_customers
    ADD CONSTRAINT website_customers_email_key UNIQUE (email);


--
-- Name: website_customers website_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_customers
    ADD CONSTRAINT website_customers_pkey PRIMARY KEY (id);


--
-- Name: website_promotion_usages website_promotion_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_promotion_usages
    ADD CONSTRAINT website_promotion_usages_pkey PRIMARY KEY (id);


--
-- Name: website_promotions website_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_promotions
    ADD CONSTRAINT website_promotions_pkey PRIMARY KEY (id);


--
-- Name: idx_capital_investments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capital_investments_date ON public.capital_investments USING btree (invested_at DESC);


--
-- Name: idx_capital_payroll_record; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_capital_payroll_record ON public.capital_investments USING btree (payroll_record_id) WHERE (payroll_record_id IS NOT NULL);


--
-- Name: idx_cash_sessions_opened_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_sessions_opened_at ON public.cash_sessions USING btree (opened_at);


--
-- Name: idx_cash_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_sessions_user_id ON public.cash_sessions USING btree (user_id);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);


--
-- Name: idx_inventory_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_variant ON public.inventory_movements USING btree (product_variant_id);


--
-- Name: idx_leave_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_employee ON public.leave_requests USING btree (employee_id, start_date DESC);


--
-- Name: idx_leave_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_status ON public.leave_requests USING btree (status);


--
-- Name: idx_notification_logs_rental; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_rental ON public.notification_logs USING btree (rental_id);


--
-- Name: idx_payments_rental; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_rental ON public.payments USING btree (rental_id);


--
-- Name: idx_payroll_allowances_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_allowances_record ON public.payroll_allowances USING btree (payroll_record_id);


--
-- Name: idx_payroll_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_period ON public.payroll_records USING btree (period_month, status);


--
-- Name: idx_product_images_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product ON public.product_images USING btree (product_id);


--
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_promo_code_usages_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_code_usages_code ON public.promotion_code_usages USING btree (promotion_code_id);


--
-- Name: idx_promo_code_usages_rental; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_code_usages_rental ON public.promotion_code_usages USING btree (rental_id);


--
-- Name: idx_promo_code_usages_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_code_usages_sale ON public.promotion_code_usages USING btree (sale_id);


--
-- Name: idx_promotion_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotion_codes_active ON public.promotion_codes USING btree (is_active);


--
-- Name: idx_promotion_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotion_codes_code ON public.promotion_codes USING btree (code);


--
-- Name: idx_promotion_usages_promo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotion_usages_promo ON public.promotion_usages USING btree (promotion_id);


--
-- Name: idx_promotion_usages_rental; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotion_usages_rental ON public.promotion_usages USING btree (rental_id);


--
-- Name: idx_promotion_usages_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotion_usages_sale ON public.promotion_usages USING btree (sale_id);


--
-- Name: idx_promotions_active_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotions_active_dates ON public.promotions USING btree (is_active, start_date, end_date);


--
-- Name: idx_promotions_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotions_scope ON public.promotions USING btree (scope);


--
-- Name: idx_rental_items_rental; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rental_items_rental ON public.rental_items USING btree (rental_id);


--
-- Name: idx_rentals_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rentals_customer ON public.rentals USING btree (customer_id);


--
-- Name: idx_rentals_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rentals_dates ON public.rentals USING btree (rental_start_date, rental_end_date);


--
-- Name: idx_rentals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rentals_status ON public.rentals USING btree (status);


--
-- Name: idx_sales_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_created ON public.sales USING btree (created_at);


--
-- Name: idx_variant_label_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_variant_label_id ON public.product_variants USING btree (label_id);


--
-- Name: idx_variants_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variants_product ON public.product_variants USING btree (product_id);


--
-- Name: idx_variants_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variants_sku ON public.product_variants USING btree (sku);


--
-- Name: idx_website_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_customers_email ON public.website_customers USING btree (email);


--
-- Name: idx_website_promotion_usages_promo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_promotion_usages_promo ON public.website_promotion_usages USING btree (website_promotion_id);


--
-- Name: idx_website_promotion_usages_rental; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_promotion_usages_rental ON public.website_promotion_usages USING btree (rental_id);


--
-- Name: idx_website_promotion_usages_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_promotion_usages_sale ON public.website_promotion_usages USING btree (sale_id);


--
-- Name: idx_website_promotions_active_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_promotions_active_dates ON public.website_promotions USING btree (is_active, start_date, end_date);


--
-- Name: rentals trg_recalculate_rental_cost; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalculate_rental_cost BEFORE UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_rental_cost();


--
-- Name: capital_investments capital_investments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_investments
    ADD CONSTRAINT capital_investments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: capital_investments capital_investments_payroll_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_investments
    ADD CONSTRAINT capital_investments_payroll_record_id_fkey FOREIGN KEY (payroll_record_id) REFERENCES public.payroll_records(id) ON DELETE SET NULL;


--
-- Name: cash_sessions cash_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: employee_profiles employee_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fine_transactions fine_transactions_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fine_transactions
    ADD CONSTRAINT fine_transactions_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.users(id);


--
-- Name: fine_transactions fine_transactions_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fine_transactions
    ADD CONSTRAINT fine_transactions_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id);


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_movements inventory_movements_product_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notification_logs notification_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: notification_logs notification_logs_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id);


--
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: payments payments_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id);


--
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: payroll_allowances payroll_allowances_payroll_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_allowances
    ADD CONSTRAINT payroll_allowances_payroll_record_id_fkey FOREIGN KEY (payroll_record_id) REFERENCES public.payroll_records(id) ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_categories product_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: promotion_code_usages promotion_code_usages_promotion_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_code_usages
    ADD CONSTRAINT promotion_code_usages_promotion_code_id_fkey FOREIGN KEY (promotion_code_id) REFERENCES public.promotion_codes(id) ON DELETE CASCADE;


--
-- Name: promotion_code_usages promotion_code_usages_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_code_usages
    ADD CONSTRAINT promotion_code_usages_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE SET NULL;


--
-- Name: promotion_code_usages promotion_code_usages_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_code_usages
    ADD CONSTRAINT promotion_code_usages_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: promotion_code_usages promotion_code_usages_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_code_usages
    ADD CONSTRAINT promotion_code_usages_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: promotion_codes promotion_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_codes
    ADD CONSTRAINT promotion_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: promotion_usages promotion_usages_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usages
    ADD CONSTRAINT promotion_usages_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;


--
-- Name: promotion_usages promotion_usages_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usages
    ADD CONSTRAINT promotion_usages_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE SET NULL;


--
-- Name: promotion_usages promotion_usages_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usages
    ADD CONSTRAINT promotion_usages_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: promotion_usages promotion_usages_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usages
    ADD CONSTRAINT promotion_usages_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: promotions promotions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: promotions promotions_free_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_free_variant_id_fkey FOREIGN KEY (free_variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: rental_items rental_items_product_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);


--
-- Name: rental_items rental_items_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_items
    ADD CONSTRAINT rental_items_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE;


--
-- Name: rentals rentals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: rentals rentals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sale_items sale_items_product_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sales sales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: website_promotion_usages website_promotion_usages_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_promotion_usages
    ADD CONSTRAINT website_promotion_usages_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE SET NULL;


--
-- Name: website_promotion_usages website_promotion_usages_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_promotion_usages
    ADD CONSTRAINT website_promotion_usages_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: website_promotion_usages website_promotion_usages_website_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_promotion_usages
    ADD CONSTRAINT website_promotion_usages_website_promotion_id_fkey FOREIGN KEY (website_promotion_id) REFERENCES public.website_promotions(id) ON DELETE CASCADE;


--
-- Name: website_promotions website_promotions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_promotions
    ADD CONSTRAINT website_promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.website_admins(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict mOqqQ60dmRILoR3Svog3gJR3QymMw2JlhY4t3HFlJUt9AWfxVfKmcUPsWa0ZEwy

