"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../config/api";
import type { CurrentAdminUser } from "./AccountingSection";
import PrintableInvoiceModal, { PrintableInvoiceData } from "./PrintableInvoiceModal";

export interface InvoiceLineItem {
  id: number;
  slNo: number;
  packageCode: string;
  description: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  employee: string;
  costPrice: number;
}

export interface DbClient {
  id: string;
  identifier: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pin?: string;
  completed?: boolean;
  source?: "website" | "manual";
  createdAt?: string;
}

export interface DbPersonnel {
  id: string;
  _id?: string;
  type: "salesman" | "referrer" | "division" | "supplier";
  name: string;
  phone?: string;
  code?: string;
  status: "active" | "inactive";
  createdAt?: string;
}

export interface DbWorkerAdmin {
  id: string;
  identifier: string;
  name?: string;
  phone?: string;
  role?: string;
}

export interface DbBankItem {
  id: string;
  _id?: string;
  bankName: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  status: "active" | "inactive";
}

export interface DbServiceItem {
  _id?: string;
  id?: string;
  serviceId?: string;
  name: string;
  slug: string;
  category?: { name: string };
}

export interface InvoiceViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
}

export default function InvoiceView({ user, onClose }: InvoiceViewProps = {}) {
  let effectiveUser = user;
  if (!effectiveUser) {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("abc_admin_user") : null;
      if (stored) effectiveUser = JSON.parse(stored);
    } catch {}
  }
  const isMaster =
    effectiveUser?.role === "master_admin" ||
    effectiveUser?.role === "superadmin" ||
    effectiveUser?.identifier === "masteradmin@abc.com";
  const canDeleteData = isMaster || (effectiveUser as any)?.canDeleteData !== false;

  // Sales State
  const [customer, setCustomer] = useState("");
  const [customerType, setCustomerType] = useState("walk_in");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  // Real Database Customers State
  const [dbClients, setDbClients] = useState<DbClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientError, setClientError] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientSourceFilter, setClientSourceFilter] = useState<"all" | "manual" | "website">("all");

  // Quick Add Client State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddName, setNewClientName] = useState("");
  const [quickAddPhone, setNewClientPhone] = useState("");
  const [quickAddEmail, setNewClientEmail] = useState("");
  const [quickAddAddress, setNewClientAddress] = useState("");
  const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active logged in worker admin
  const currentUser = user?.name || user?.identifier || "Fathima";

  // Invoice Meta State (Stored sequence in DB starting from 0000)
  const [invoiceNo, setInvoiceNo] = useState("0000");
  const [recentInvoiceNo, setRecentInvoiceNo] = useState("0000");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [invoiceTime, setInvoiceTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [lpoNo, setLpoNo] = useState("");

  // Real Database Personnel State (Salesmen, Referrers, Divisions)
  const [salesmen, setSalesmen] = useState<DbPersonnel[]>([]);
  const [referrers, setReferrers] = useState<DbPersonnel[]>([]);
  const [divisions, setDivisions] = useState<DbPersonnel[]>([]);
  const [salesMan, setSalesMan] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [division, setDivision] = useState("");

  // Quick Add Popover States for Personnel
  const [isAddSalesmanOpen, setIsAddSalesmanOpen] = useState(false);
  const [newSalesmanName, setNewSalesmanName] = useState("");
  const [newSalesmanPhone, setNewSalesmanPhone] = useState("");
  const [isSavingSalesman, setIsSavingSalesman] = useState(false);

  const [isAddReferrerOpen, setIsAddReferrerOpen] = useState(false);
  const [newReferrerName, setNewReferrerName] = useState("");
  const [newReferrerPhone, setNewReferrerPhone] = useState("");
  const [isSavingReferrer, setIsSavingReferrer] = useState(false);

  const [isAddDivisionOpen, setIsAddDivisionOpen] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [newDivisionCode, setNewDivisionCode] = useState("");
  const [isSavingDivision, setIsSavingDivision] = useState(false);

  const salesmanRef = useRef<HTMLDivElement>(null);
  const referrerRef = useRef<HTMLDivElement>(null);
  const divisionRef = useRef<HTMLDivElement>(null);

  // Services Catalog State
  const [servicesList, setServicesList] = useState<DbServiceItem[]>([]);
  const [itemPackageCode, setItemPackageCode] = useState("");

  // Worker Admins as Employees State
  const [workerEmployees, setWorkerEmployees] = useState<DbWorkerAdmin[]>([]);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePhone, setNewEmployeePhone] = useState("");
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const employeeRef = useRef<HTMLDivElement>(null);

  // Banks State
  const [bankList, setBankList] = useState<DbBankItem[]>([]);
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankAccountNo, setNewBankAccountNo] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const bankRef = useRef<HTMLDivElement>(null);

  // Suppliers State
  const [suppliers, setSuppliers] = useState<DbPersonnel[]>([]);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierCode, setNewSupplierCode] = useState("");
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  // Details State
  const [itemType, setItemType] = useState("Service");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState<number | "">("");
  const [itemUnitPrice, setItemUnitPrice] = useState<number | "">("");
  const [itemAmount, setItemAmount] = useState<number | "">("");
  const [itemEmployee, setItemEmployee] = useState("");
  const [itemRa, setItemRa] = useState("");
  const [govtFeePaidByCustomer, setGovtFeePaidByCustomer] = useState(false);
  const [govtFeeAmount, setGovtFeeAmount] = useState("");
  const [bank, setBank] = useState("");
  const [bankC, setBankC] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierC, setSupplierC] = useState("");

  // Line Items Table
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Payment Details State
  const [payDescription, setPayDescription] = useState("");
  const [adjustAdvance, setAdjustAdvance] = useState(false);
  const [payGovtFee, setPayGovtFee] = useState("0");
  const [payMethod, setPayMethod] = useState("");
  const [payCash, setPayCash] = useState("");
  const [payCc, setPayCc] = useState("");

  // Financial Summary State
  const [totalBankCost, setTotalBankCost] = useState("0.00");
  const [totalSupplierCost, setTotalSupplierCost] = useState("0.00");
  const [costM, setCostM] = useState("0");
  const [total, setTotal] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [taxableAmount, setTaxableAmount] = useState("0");
  const [discount, setDiscount] = useState("");
  const [totalBeforeVat, setTotalBeforeVat] = useState("0.00");
  const [vat, setVat] = useState("0");
  const [grossAmount, setGrossAmount] = useState("0.00");
  const [paid, setPaid] = useState("0.00");
  const [balance, setBalance] = useState("0.00");
  const [bankDetailsChecked, setBankDetailsChecked] = useState(true);

  // Invoices Ledger & Printable Preview States
  const [invoicesLedger, setInvoicesLedger] = useState<any[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [invoiceBannerMsg, setInvoiceBannerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activePrintInvoice, setActivePrintInvoice] = useState<PrintableInvoiceData | null>(null);

  // Auto-calculate financial summary when lineItems, discount, vat, or paid change
  useEffect(() => {
    const itemsSum = lineItems.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);
    const discNum = Number(discount) || 0;
    const subtotalNum = itemsSum > 0 ? itemsSum : Number(total) || 0;
    const beforeVatNum = Math.max(0, subtotalNum - discNum);
    const vatNum = vat !== "" ? Number(vat) || 0 : Math.round(beforeVatNum * 0.05 * 100) / 100;
    const grossNum = Math.round((beforeVatNum + vatNum) * 100) / 100;
    const paidNum = Number(paid) || 0;
    const balNum = Math.max(0, Math.round((grossNum - paidNum) * 100) / 100);

    if (itemsSum > 0) {
      setTotal(itemsSum.toFixed(2));
      setTotalBeforeVat(beforeVatNum.toFixed(2));
      setGrossAmount(grossNum.toFixed(2));
      setBalance(balNum.toFixed(2));
      if (vat === "" || vat === "0") {
        setVat(vatNum.toFixed(2));
      }
    }
  }, [lineItems, discount, vat, paid, total]);

  // Helper to build auth headers for real MongoDB requests
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("abc_admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        const stored = localStorage.getItem("abc_admin_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.id) headers["x-admin-id"] = u.id;
          if (u?.role) headers["x-admin-role"] = u.role;
          if (u?.identifier) headers["x-admin-identifier"] = u.identifier;
        }
      } catch {
        // ignore
      }
    }
    if (user?.id) {
      headers["x-admin-id"] = user.id;
      headers["x-admin-role"] = user.role || "worker_admin";
      headers["x-admin-identifier"] = user.identifier || "";
    }
    return headers;
  }, [user]);

  // Fetch real clients from MongoDB
  const fetchClients = useCallback(
    async (query = "") => {
      setIsLoadingClients(true);
      setClientError("");
      try {
        const url = query.trim()
          ? `${API_BASE_URL}/api/v1/admin/clients?search=${encodeURIComponent(query.trim())}`
          : `${API_BASE_URL}/api/v1/admin/clients`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) {
          throw new Error(`Failed to load clients (${res.status})`);
        }
        const json = await res.json();
        if (json.data?.clients) {
          setDbClients(json.data.clients);
        }
      } catch (err: unknown) {
        console.error("Error fetching clients from MongoDB:", err);
        setClientError(err instanceof Error ? err.message : "Error connecting to database");
      } finally {
        setIsLoadingClients(false);
      }
    },
    [getAuthHeaders]
  );

  // Fetch Invoice Sequence from MongoDB
  const fetchInvoiceSequence = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoice-sequence`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setInvoiceNo(json.data.nextInvoiceNo || "0000");
          setRecentInvoiceNo(json.data.recentInvoiceNo || "0000");
        }
      }
    } catch (err) {
      console.error("Error fetching invoice sequence:", err);
    }
  }, [getAuthHeaders]);

  // Fetch Personnel (Salesmen, Referrers, Divisions, Suppliers) from MongoDB
  const fetchPersonnel = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        const list: DbPersonnel[] = json.data?.personnel || [];
        setSalesmen(list.filter((p) => p.type === "salesman"));
        setReferrers(list.filter((p) => p.type === "referrer"));
        setDivisions(list.filter((p) => p.type === "division"));
        setSuppliers(list.filter((p) => p.type === "supplier"));
      }
    } catch (err) {
      console.error("Error fetching personnel:", err);
    }
  }, [getAuthHeaders]);

  // Fetch real Services from MongoDB catalog
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/services`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.services) {
          setServicesList(json.data.services);
        }
      }
    } catch (err) {
      console.error("Error loading services:", err);
    }
  }, [getAuthHeaders]);

  // Fetch real Worker Admins as Employees from MongoDB
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/workers`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.workers) {
          setWorkerEmployees(json.data.workers);
        }
      }
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  }, [getAuthHeaders]);

  // Fetch real Banks from MongoDB
  const fetchBanks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/banks`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.banks) {
          setBankList(json.data.banks);
        }
      }
    } catch (err) {
      console.error("Error loading banks:", err);
    }
  }, [getAuthHeaders]);

  // Fetch real Invoices Ledger from MongoDB
  const fetchInvoicesLedger = useCallback(
    async (query = "") => {
      setIsLoadingLedger(true);
      try {
        const url = query.trim()
          ? `${API_BASE_URL}/api/v1/admin/accounting/invoices?search=${encodeURIComponent(query.trim())}`
          : `${API_BASE_URL}/api/v1/admin/accounting/invoices`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const json = await res.json();
          setInvoicesLedger(json.data?.invoices || []);
        }
      } catch (err) {
        console.error("Error loading invoices ledger:", err);
      } finally {
        setIsLoadingLedger(false);
      }
    },
    [getAuthHeaders]
  );

  // Initial load & real-time sync with database events
  useEffect(() => {
    fetchClients();
    fetchInvoiceSequence();
    fetchPersonnel();
    fetchServices();
    fetchEmployees();
    fetchBanks();
    fetchInvoicesLedger();

    const handleClientUpdated = () => fetchClients();
    const handlePersonnelUpdated = () => fetchPersonnel();
    const handleBanksUpdated = () => fetchBanks();
    const handleWorkersUpdated = () => fetchEmployees();
    const handleInvoiceUpdated = () => fetchInvoicesLedger();

    window.addEventListener("abc_client_updated", handleClientUpdated);
    window.addEventListener("abc_personnel_updated", handlePersonnelUpdated);
    window.addEventListener("abc_banks_updated", handleBanksUpdated);
    window.addEventListener("abc_worker_admin_created", handleWorkersUpdated);
    window.addEventListener("abc_invoice_saved", handleInvoiceUpdated);

    return () => {
      window.removeEventListener("abc_client_updated", handleClientUpdated);
      window.removeEventListener("abc_personnel_updated", handlePersonnelUpdated);
      window.removeEventListener("abc_banks_updated", handleBanksUpdated);
      window.removeEventListener("abc_worker_admin_created", handleWorkersUpdated);
      window.removeEventListener("abc_invoice_saved", handleInvoiceUpdated);
    };
  }, [fetchClients, fetchInvoiceSequence, fetchPersonnel, fetchServices, fetchEmployees, fetchBanks, fetchInvoicesLedger]);

  // Click outside listener for search popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setIsCustomerSearchOpen(false);
        setIsQuickAddOpen(false);
      }
      if (salesmanRef.current && !salesmanRef.current.contains(target)) {
        setIsAddSalesmanOpen(false);
      }
      if (referrerRef.current && !referrerRef.current.contains(target)) {
        setIsAddReferrerOpen(false);
      }
      if (divisionRef.current && !divisionRef.current.contains(target)) {
        setIsAddDivisionOpen(false);
      }
      if (employeeRef.current && !employeeRef.current.contains(target)) {
        setIsAddEmployeeOpen(false);
      }
      if (bankRef.current && !bankRef.current.contains(target)) {
        setIsAddBankOpen(false);
      }
      if (supplierRef.current && !supplierRef.current.contains(target)) {
        setIsAddSupplierOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Autofocus search input when opened
  useEffect(() => {
    if (isCustomerSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isCustomerSearchOpen]);

  // Quick-Add Salesman
  const handleSaveSalesman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesmanName.trim()) return;
    setIsSavingSalesman(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "salesman",
          name: newSalesmanName.trim(),
          phone: newSalesmanPhone.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const item: DbPersonnel = json.data?.item;
        if (item) {
          setSalesmen((prev) => [item, ...prev]);
          setSalesMan(item.name);
          window.dispatchEvent(new Event("abc_personnel_updated"));
        }
        setNewSalesmanName("");
        setNewSalesmanPhone("");
        setIsAddSalesmanOpen(false);
      }
    } catch (err) {
      console.error("Error creating salesman:", err);
    } finally {
      setIsSavingSalesman(false);
    }
  };

  // Quick-Add Referrer
  const handleSaveReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReferrerName.trim()) return;
    setIsSavingReferrer(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "referrer",
          name: newReferrerName.trim(),
          phone: newReferrerPhone.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const item: DbPersonnel = json.data?.item;
        if (item) {
          setReferrers((prev) => [item, ...prev]);
          setReferredBy(item.name);
          window.dispatchEvent(new Event("abc_personnel_updated"));
        }
        setNewReferrerName("");
        setNewReferrerPhone("");
        setIsAddReferrerOpen(false);
      }
    } catch (err) {
      console.error("Error creating referrer:", err);
    } finally {
      setIsSavingReferrer(false);
    }
  };

  // Quick-Add Division
  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivisionName.trim()) return;
    setIsSavingDivision(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "division",
          name: newDivisionName.trim(),
          code: newDivisionCode.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const item: DbPersonnel = json.data?.item;
        if (item) {
          setDivisions((prev) => [item, ...prev]);
          setDivision(item.name);
          window.dispatchEvent(new Event("abc_personnel_updated"));
        }
        setNewDivisionName("");
        setNewDivisionCode("");
        setIsAddDivisionOpen(false);
      }
    } catch (err) {
      console.error("Error creating division:", err);
    } finally {
      setIsSavingDivision(false);
    }
  };

  // Save invoice and atomically advance sequence counter in MongoDB
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const handleSaveInvoice = async () => {
    if (!customer.trim() && !mobile.trim()) {
      setInvoiceBannerMsg({
        type: "error",
        text: "Please select or enter a Customer Name or Mobile Number before saving.",
      });
      return null;
    }

    setIsSavingInvoice(true);
    setInvoiceBannerMsg(null);
    try {
      const matchingClient = dbClients.find(
        (c) =>
          (mobile && c.phone === mobile) ||
          (code && c.identifier === code) ||
          (customer && c.name?.toLowerCase() === customer.toLowerCase())
      );

      const computedLineItems =
        lineItems.length > 0
          ? lineItems
          : [
              {
                id: Date.now(),
                slNo: 1,
                packageCode: itemPackageCode || code || "SRV-01",
                description: itemDesc.trim() || "Corporate & PRO Services",
                qty: Number(itemQty) || 1,
                unitPrice: Number(itemUnitPrice) || Number(total) || 0,
                totalAmount: Number(itemAmount) || Number(total) || 0,
                employee: itemEmployee || currentUser,
                costPrice: 0,
              },
            ];

      const payload = {
        invoiceNo,
        invoiceDate,
        invoiceTime,
        lpoNo,
        salesMan,
        referredBy,
        division,
        customer: {
          name: customer.trim() || "Walk-in Customer",
          mobile: mobile.trim(),
          code: code.trim(),
          address: address.trim(),
          email: email.trim(),
          company: company.trim(),
          customerType,
          clientId: matchingClient?.id,
        },
        lineItems: computedLineItems,
        paymentDetails: {
          payDescription,
          adjustAdvance,
          payGovtFee,
          payMethod:
            payMethod ||
            (Number(payCash) > 0
              ? "cash"
              : Number(payCc) > 0
              ? "card"
              : "bank"),
          payCash,
          payCc,
        },
        financialSummary: {
          total: total || "0.00",
          discount: discount || "0.00",
          discountPercent,
          totalBeforeVat: totalBeforeVat || total || "0.00",
          vat: vat || "0.00",
          grossAmount: grossAmount || total || "0.00",
          paid: paid || "0.00",
          balance: balance || "0.00",
        },
        bank,
        bankC,
        supplier,
        supplierC,
        govtFeePaidByCustomer,
        govtFeeAmount,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to save invoice (${res.status})`);
      }

      const json = await res.json();
      const savedInvoice = json.data?.invoice;
      const nextInv = json.data?.nextInvoiceNo;

      if (nextInv) {
        setInvoiceNo(nextInv);
      }
      if (json.data?.recentInvoiceNo) {
        setRecentInvoiceNo(json.data.recentInvoiceNo);
      }

      setInvoiceBannerMsg({
        type: "success",
        text: `✓ Invoice #${savedInvoice?.invoiceNo || invoiceNo} successfully saved in MongoDB.`,
      });

      // Clear line items for next entry
      setLineItems([]);
      setItemDesc("");
      setItemPackageCode("");
      setItemQty("");
      setItemUnitPrice("");
      setItemAmount("");
      setTotal("");
      setGrossAmount("0.00");
      setPaid("0.00");
      setBalance("0.00");

      window.dispatchEvent(
        new CustomEvent("abc_invoice_saved", { detail: savedInvoice })
      );
      fetchInvoicesLedger();

      return savedInvoice;
    } catch (err: unknown) {
      console.error("Error saving invoice to MongoDB:", err);
      setInvoiceBannerMsg({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to persist invoice to MongoDB.",
      });
      return null;
    } finally {
      setIsSavingInvoice(false);
    }
  };

  // Open Printable Invoice Modal for current active form
  const handlePrintCurrentInvoice = () => {
    const currentInvData: PrintableInvoiceData = {
      invoiceNo,
      invoiceDate,
      invoiceTime,
      lpoNo,
      salesMan,
      referredBy,
      division,
      customer: {
        name: customer || "Walk-in Customer",
        mobile,
        code,
        address,
        email,
        company,
        customerType,
      },
      lineItems:
        lineItems.length > 0
          ? lineItems
          : [
              {
                slNo: 1,
                packageCode: itemPackageCode || code || "SRV-01",
                description: itemDesc.trim() || "Corporate & PRO Services",
                qty: Number(itemQty) || 1,
                unitPrice: Number(itemUnitPrice) || Number(total) || 0,
                totalAmount: Number(itemAmount) || Number(total) || 0,
                employee: itemEmployee || currentUser,
              },
            ],
      paymentDetails: {
        payDescription,
        payMethod,
        payCash,
        payCc,
      },
      financialSummary: {
        total: total || "0.00",
        discount: discount || "0.00",
        discountPercent,
        totalBeforeVat: totalBeforeVat || total || "0.00",
        vat: vat || "0.00",
        grossAmount: grossAmount || total || "0.00",
        paid: paid || "0.00",
        balance: balance || "0.00",
      },
      bank,
      status:
        Number(balance) <= 0 && Number(grossAmount) > 0
          ? "paid"
          : Number(paid) > 0
          ? "partial"
          : "unpaid",
    };

    setActivePrintInvoice(currentInvData);
  };

  // Load a saved invoice into the editor for viewing / modifying
  const handleLoadInvoice = (inv: any) => {
    setInvoiceNo(inv.invoiceNo);
    if (inv.invoiceDate) setInvoiceDate(inv.invoiceDate);
    if (inv.invoiceTime) setInvoiceTime(inv.invoiceTime);
    if (inv.lpoNo) setLpoNo(inv.lpoNo);
    if (inv.salesMan) setSalesMan(inv.salesMan);
    if (inv.referredBy) setReferredBy(inv.referredBy);
    if (inv.division) setDivision(inv.division);

    if (inv.customer) {
      setCustomer(inv.customer.name || "");
      setMobile(inv.customer.mobile || "");
      setCode(inv.customer.code || "");
      setAddress(inv.customer.address || "");
      setEmail(inv.customer.email || "");
      setCompany(inv.customer.company || "");
      setCustomerType(inv.customer.customerType || "registered");
    }

    if (inv.lineItems && Array.isArray(inv.lineItems)) {
      setLineItems(
        inv.lineItems.map((li: any, idx: number) => ({
          id: Date.now() + idx,
          slNo: li.slNo || idx + 1,
          packageCode: li.packageCode || "",
          description: li.description || "",
          qty: li.qty || 1,
          unitPrice: li.unitPrice || 0,
          totalAmount: li.totalAmount || 0,
          employee: li.employee || "",
          costPrice: li.costPrice || 0,
        }))
      );
    }

    if (inv.paymentDetails) {
      setPayDescription(inv.paymentDetails.payDescription || "");
      setAdjustAdvance(Boolean(inv.paymentDetails.adjustAdvance));
      setPayGovtFee(inv.paymentDetails.payGovtFee || "0");
      setPayMethod(inv.paymentDetails.payMethod || "");
      setPayCash(inv.paymentDetails.payCash || "");
      setPayCc(inv.paymentDetails.payCc || "");
    }

    if (inv.financialSummary) {
      setTotal(inv.financialSummary.total || "");
      setDiscount(inv.financialSummary.discount || "");
      setDiscountPercent(inv.financialSummary.discountPercent || "");
      setTotalBeforeVat(inv.financialSummary.totalBeforeVat || "");
      setVat(inv.financialSummary.vat || "");
      setGrossAmount(inv.financialSummary.grossAmount || "");
      setPaid(inv.financialSummary.paid || "");
      setBalance(inv.financialSummary.balance || "");
    }

    if (inv.bank) setBank(inv.bank);
    if (inv.bankC) setBankC(inv.bankC);
    if (inv.supplier) setSupplier(inv.supplier);
    if (inv.supplierC) setSupplierC(inv.supplierC);

    window.scrollTo({ top: 0, behavior: "smooth" });
    setInvoiceBannerMsg({
      type: "success",
      text: `Loaded Invoice #${inv.invoiceNo} into editor.`,
    });
  };

  // Permanently delete invoice from MongoDB
  const handleDeleteInvoice = async (id: string, invNum: string) => {
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete Invoice #${invNum} from MongoDB?`)) {
      return;
    }
    setDeletingInvoiceId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setInvoicesLedger((prev) => prev.filter((inv) => (inv.id || inv._id) !== id));
        setInvoiceBannerMsg({
          type: "success",
          text: `Invoice #${invNum} deleted from MongoDB.`,
        });
        window.dispatchEvent(new CustomEvent("abc_invoice_saved"));
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.message || "Failed to delete invoice");
      }
    } catch (err) {
      console.error("Error deleting invoice:", err);
      alert("Error deleting invoice from database.");
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  // Select customer from database & prefill inputs
  const handleSelectCustomer = (c: DbClient) => {
    setCustomer(c.name || c.identifier);
    setMobile(c.phone || "");
    setCode(c.identifier || "");
    setAddress(c.address || "");
    setEmail(c.email || "");
    setCompany(c.name || "");
    setCustomerType("registered");
    setIsCustomerSearchOpen(false);
    setIsQuickAddOpen(false);
  };

  // Select Walk-in customer
  const handleSelectWalkIn = () => {
    setCustomer("Walk-in Customer");
    setMobile("");
    setCode("WALK-IN");
    setAddress("");
    setEmail("");
    setCompany("");
    setCustomerType("walk_in");
    setIsCustomerSearchOpen(false);
    setIsQuickAddOpen(false);
  };

  // Customer Type change
  const handleCustomerTypeChange = (typeVal: string) => {
    setCustomerType(typeVal);
    if (typeVal === "walk_in") {
      handleSelectWalkIn();
    } else if (typeVal === "registered" || typeVal === "corporate") {
      setIsCustomerSearchOpen(true);
      if (dbClients.length === 0) {
        fetchClients();
      }
    }
  };

  // Quick-Add new client to MongoDB
  const handleSaveQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim() && !quickAddPhone.trim() && !quickAddEmail.trim()) {
      setQuickAddError("Please provide at least a Name, Phone, or Email.");
      return;
    }
    setIsSavingQuickAdd(true);
    setQuickAddError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: quickAddName.trim(),
          phone: quickAddPhone.trim(),
          email: quickAddEmail.trim(),
          address: quickAddAddress.trim(),
          source: "manual",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to create client in database.");
      }
      const createdClient: DbClient = json.data?.client;
      if (createdClient) {
        setDbClients((prev) => [createdClient, ...prev]);
        window.dispatchEvent(new Event("abc_client_updated"));
        handleSelectCustomer(createdClient);
      }
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
      setNewClientAddress("");
      setIsQuickAddOpen(false);
    } catch (err: unknown) {
      setQuickAddError(err instanceof Error ? err.message : "Error creating client in database");
    } finally {
      setIsSavingQuickAdd(false);
    }
  };

  // Filter clients for search table
  const filteredClients = dbClients.filter((c) => {
    if (clientSourceFilter !== "all" && c.source !== clientSourceFilter) {
      return false;
    }
    if (!clientSearchTerm.trim()) return true;
    const term = clientSearchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.identifier && c.identifier.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  });

  // Quick-Add Employee (Worker Admin)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    setIsSavingEmployee(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/workers`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEmployeeName.trim(),
          phone: newEmployeePhone.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const worker: DbWorkerAdmin = json.data?.worker;
        if (worker) {
          setWorkerEmployees((prev) => [worker, ...prev]);
          setItemEmployee(worker.name || worker.identifier);
          window.dispatchEvent(new Event("abc_worker_admin_created"));
        }
        setNewEmployeeName("");
        setNewEmployeePhone("");
        setIsAddEmployeeOpen(false);
      }
    } catch (err) {
      console.error("Error creating employee:", err);
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Quick-Add Bank
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    setIsSavingBank(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/banks`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: newBankName.trim(),
          accountNumber: newBankAccountNo.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const b: DbBankItem = json.data?.bank;
        if (b) {
          setBankList((prev) => [b, ...prev]);
          setBank(b.bankName);
          window.dispatchEvent(new Event("abc_banks_updated"));
        }
        setNewBankName("");
        setNewBankAccountNo("");
        setIsAddBankOpen(false);
      }
    } catch (err) {
      console.error("Error creating bank:", err);
    } finally {
      setIsSavingBank(false);
    }
  };

  // Quick-Add Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setIsSavingSupplier(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "supplier",
          name: newSupplierName.trim(),
          phone: newSupplierPhone.trim(),
          code: newSupplierCode.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const item: DbPersonnel = json.data?.item;
        if (item) {
          setSuppliers((prev) => [item, ...prev]);
          setSupplier(item.name);
          window.dispatchEvent(new Event("abc_personnel_updated"));
        }
        setNewSupplierName("");
        setNewSupplierPhone("");
        setNewSupplierCode("");
        setIsAddSupplierOpen(false);
      }
    } catch (err) {
      console.error("Error creating supplier:", err);
    } finally {
      setIsSavingSupplier(false);
    }
  };

  // Helper to add a row to table
  const handleAddItem = () => {
    if (!itemDesc.trim() && !itemAmount) return;
    const qtyVal = Number(itemQty) || 1;
    const unitPriceVal = Number(itemUnitPrice) || 0;
    const totalAmountVal = Number(itemAmount) || qtyVal * unitPriceVal;

    const newItem: InvoiceLineItem = {
      id: Date.now(),
      slNo: lineItems.length + 1,
      packageCode: itemPackageCode || code || `SRV-${String(lineItems.length + 1).padStart(2, "0")}`,
      description: itemDesc.trim() || "Service Item",
      qty: qtyVal,
      unitPrice: unitPriceVal,
      totalAmount: totalAmountVal,
      employee: itemEmployee || currentUser,
      costPrice: 0,
    };
    setLineItems((prev) => [...prev, newItem]);
    setItemDesc("");
    setItemPackageCode("");
    setItemQty("");
    setItemUnitPrice("");
    setItemAmount("");
  };

  // Helper to remove selected row
  const handleRemoveItem = () => {
    if (selectedRowId === null) {
      if (lineItems.length > 0) {
        setLineItems((prev) => prev.slice(0, -1));
      }
      return;
    }
    setLineItems((prev) =>
      prev
        .filter((item) => item.id !== selectedRowId)
        .map((item, idx) => ({ ...item, slNo: idx + 1 }))
    );
    setSelectedRowId(null);
  };

  // Helper to edit/change selected row
  const handleChangeItem = () => {
    if (selectedRowId === null) return;
    const item = lineItems.find((li) => li.id === selectedRowId);
    if (!item) return;
    setItemDesc(item.description);
    setItemPackageCode(item.packageCode);
    setItemQty(item.qty);
    setItemUnitPrice(item.unitPrice);
    setItemAmount(item.totalAmount);
    setItemEmployee(item.employee);

    setLineItems((prev) =>
      prev
        .filter((li) => li.id !== selectedRowId)
        .map((li, idx) => ({ ...li, slNo: idx + 1 }))
    );
    setSelectedRowId(null);
  };

  return (
    <div className="erp-invoice-window" aria-label="Invoice Form">
      {/* -------------------------------------------------------------
          WINDOW TITLE BAR (Classic ERP Window Style)
          ------------------------------------------------------------- */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <line x1="8" x2="16" y1="6" y2="6" />
            <line x1="16" x2="16" y1="14" />
            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01" />
          </svg>
          <span className="erp-window-title-text">Invoice</span>
        </div>
        <div className="erp-window-controls">
          <button type="button" className="erp-win-btn" aria-label="Minimize" tabIndex={-1}>_</button>
          <button type="button" className="erp-win-btn" aria-label="Maximize" tabIndex={-1}>□</button>
          <button type="button" className="erp-win-btn close" aria-label="Close" onClick={onClose} tabIndex={-1}>✕</button>
        </div>
      </div>

      <div className="erp-window-body">
        {invoiceBannerMsg && (
          <div className={`erp-invoice-banner ${invoiceBannerMsg.type}`}>
            <span>{invoiceBannerMsg.text}</span>
            <button
              type="button"
              className="erp-banner-dismiss"
              onClick={() => setInvoiceBannerMsg(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 1: TOP GRID (Sales Fieldset & Invoice Meta)
            ------------------------------------------------------------- */}
        <div className="erp-top-grid">
          {/* Left Fieldset: Sales */}
          <fieldset className="erp-fieldset erp-sales-fieldset">
            <legend className="erp-legend">Sales</legend>
            <div className="erp-form-rows">
              {/* Customer */}
              <div className="erp-form-row erp-customer-row" ref={searchContainerRef}>
                <label className="erp-label required">Customer *</label>
                <div className="erp-input-with-tools erp-flex-1">
                  <div
                    className="erp-customer-box-trigger erp-flex-1"
                    onClick={() => {
                      setIsCustomerSearchOpen(true);
                      if (dbClients.length === 0) fetchClients();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsCustomerSearchOpen(true);
                        if (dbClients.length === 0) fetchClients();
                      }
                    }}
                  >
                    <span className={`erp-customer-display ${customer ? "has-val" : "placeholder"}`}>
                      {customer || "- Click or Press to Search Customer from DB -"}
                    </span>
                    <span className="erp-select-arrow" aria-hidden="true">▾</span>
                  </div>

                  <button
                    type="button"
                    className="erp-icon-btn erp-btn-orange"
                    title="Add New Customer to Database"
                    onClick={() => {
                      setIsCustomerSearchOpen(true);
                      setIsQuickAddOpen((prev) => !prev);
                      if (dbClients.length === 0) fetchClients();
                    }}
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className={`erp-icon-btn erp-btn-binoculars ${isCustomerSearchOpen ? "active" : ""}`}
                    title="Search Customer in Database"
                    onClick={() => {
                      setIsCustomerSearchOpen((prev) => !prev);
                      if (!isCustomerSearchOpen && dbClients.length === 0) fetchClients();
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="7" cy="12" r="4" />
                      <circle cx="17" cy="12" r="4" />
                      <line x1="11" y1="12" x2="13" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Database Customer Search Popover */}
                {isCustomerSearchOpen && (
                  <div className="erp-customer-search-popover" role="dialog" aria-label="Customer Database Lookup">
                    {/* Popover Header */}
                    <div className="erp-popover-header">
                      <div className="erp-popover-title">
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        <span>Customer Database Lookup</span>
                        <span className="erp-badge-count">{filteredClients.length}</span>
                      </div>
                      <div className="erp-popover-actions">
                        <button
                          type="button"
                          className="erp-mini-btn"
                          onClick={() => fetchClients(clientSearchTerm)}
                          title="Reload customers from DB"
                        >
                          ↻ Reload
                        </button>
                        <button
                          type="button"
                          className="erp-popover-close-btn"
                          onClick={() => {
                            setIsCustomerSearchOpen(false);
                            setIsQuickAddOpen(false);
                          }}
                          title="Close (Esc)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Popover Toolbar: Search Bar + Quick Actions */}
                    <div className="erp-popover-toolbar">
                      <div className="erp-popover-search-box">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#64748b" strokeWidth="2.2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          ref={searchInputRef}
                          type="text"
                          className="erp-popover-search-input"
                          placeholder="Search customer by Name, Code, Mobile, Email..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                        />
                        {clientSearchTerm && (
                          <button
                            type="button"
                            className="erp-search-clear-btn"
                            onClick={() => setClientSearchTerm("")}
                            title="Clear search"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="erp-popover-quick-actions">
                        <button
                          type="button"
                          className="erp-chip-btn walkin"
                          onClick={handleSelectWalkIn}
                          title="Select Walk-in Customer"
                        >
                          🚶 Walk-in
                        </button>
                        <button
                          type="button"
                          className={`erp-chip-btn ${isQuickAddOpen ? "active" : ""}`}
                          onClick={() => setIsQuickAddOpen((prev) => !prev)}
                          title="Add new customer to database"
                        >
                          {isQuickAddOpen ? "− Close Form" : "+ New Client to DB"}
                        </button>
                      </div>
                    </div>

                    {/* Quick Add Client Form (POSTs to /api/v1/admin/clients) */}
                    {isQuickAddOpen && (
                      <form className="erp-quick-add-client-panel" onSubmit={handleSaveQuickClient}>
                        <div className="erp-quick-add-title">
                          <span>+ Create New Customer in Real MongoDB Database</span>
                        </div>
                        {quickAddError && (
                          <div className="erp-quick-add-error">{quickAddError}</div>
                        )}
                        <div className="erp-quick-add-grid">
                          <input
                            type="text"
                            className="erp-input"
                            placeholder="Customer Name *"
                            value={quickAddName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            required
                          />
                          <input
                            type="text"
                            className="erp-input"
                            placeholder="Mobile (050-XXXXXXX)"
                            value={quickAddPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                          />
                          <input
                            type="email"
                            className="erp-input"
                            placeholder="Email address"
                            value={quickAddEmail}
                            onChange={(e) => setNewClientEmail(e.target.value)}
                          />
                          <input
                            type="text"
                            className="erp-input"
                            placeholder="Address (City, UAE)"
                            value={quickAddAddress}
                            onChange={(e) => setNewClientAddress(e.target.value)}
                          />
                        </div>
                        <div className="erp-quick-add-actions">
                          <button
                            type="submit"
                            className="erp-btn-save-client"
                            disabled={isSavingQuickAdd}
                          >
                            {isSavingQuickAdd ? "Saving to DB..." : "Save to DB & Select"}
                          </button>
                          <button
                            type="button"
                            className="erp-btn-cancel-client"
                            onClick={() => setIsQuickAddOpen(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Results Table */}
                    <div className="erp-popover-results-scroll">
                      {isLoadingClients ? (
                        <div className="erp-popover-loading">
                          <div className="erp-spinner" />
                          <span>Loading customers from MongoDB database...</span>
                        </div>
                      ) : clientError ? (
                        <div className="erp-popover-error">
                          <span>{clientError}</span>
                          <button
                            type="button"
                            className="erp-mini-btn"
                            onClick={() => fetchClients()}
                          >
                            Retry Connection
                          </button>
                        </div>
                      ) : filteredClients.length === 0 ? (
                        <div className="erp-popover-empty">
                          <p>No customers found matching &quot;{clientSearchTerm}&quot;.</p>
                          <button
                            type="button"
                            className="erp-chip-btn"
                            onClick={() => {
                              setIsQuickAddOpen(true);
                              if (clientSearchTerm.trim()) {
                                setNewClientName(clientSearchTerm.trim());
                              }
                            }}
                          >
                            + Create &quot;{clientSearchTerm || "New Customer"}&quot; in Database
                          </button>
                        </div>
                      ) : (
                        <table className="erp-customer-search-table">
                          <thead>
                            <tr>
                              <th style={{ width: "85px" }}>Code</th>
                              <th style={{ width: "160px" }}>Customer Name</th>
                              <th style={{ width: "110px" }}>Mobile</th>
                              <th style={{ width: "140px" }}>Email</th>
                              <th>Address</th>
                              <th style={{ width: "60px", textAlign: "center" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredClients.map((c) => (
                              <tr
                                key={c.id}
                                className={`erp-customer-row-item ${customer === (c.name || c.identifier) ? "selected" : ""}`}
                                onClick={() => handleSelectCustomer(c)}
                                title="Click to select and prefill sales inputs"
                              >
                                <td className="erp-code-cell">{c.identifier || "CU-NEW"}</td>
                                <td className="erp-name-cell">
                                  <strong>{c.name || "Unnamed Client"}</strong>
                                </td>
                                <td className="erp-phone-cell">{c.phone || "—"}</td>
                                <td className="erp-email-cell">{c.email || "—"}</td>
                                <td className="erp-address-cell">{c.address || "—"}</td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    className="erp-select-badge-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectCustomer(c);
                                    }}
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Popover Footer */}
                    <div className="erp-popover-footer">
                      <span className="erp-popover-footer-note">
                        💡 Click any customer to prefill Mobile, Code, Address, Email & Company
                      </span>
                      <button
                        type="button"
                        className="erp-popover-footer-close"
                        onClick={() => {
                          setIsCustomerSearchOpen(false);
                          setIsQuickAddOpen(false);
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cust. Type */}
              <div className="erp-form-row">
                <label className="erp-label">Cust. Type</label>
                <select
                  className="erp-select erp-flex-1"
                  value={customerType}
                  onChange={(e) => handleCustomerTypeChange(e.target.value)}
                >
                  <option value="walk_in">Walk-in Customer</option>
                  <option value="registered">Registered Client (From DB)</option>
                  <option value="corporate">Corporate Account</option>
                  <option value="cash">Cash / One-Time</option>
                </select>
              </div>

              {/* Mobile */}
              <div className="erp-form-row">
                <label className="erp-label">Mobile</label>
                <input
                  type="text"
                  className="erp-input erp-w-180"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="050-XXXXXXX"
                />
              </div>

              {/* Code */}
              <div className="erp-form-row">
                <label className="erp-label">Code</label>
                <input
                  type="text"
                  className="erp-input erp-w-180"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              {/* Address */}
              <div className="erp-form-row">
                <label className="erp-label">Address :</label>
                <input
                  type="text"
                  className="erp-input erp-flex-1"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="erp-form-row">
                <label className="erp-label">Email :</label>
                <input
                  type="email"
                  className="erp-input erp-flex-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Company */}
              <div className="erp-form-row">
                <label className="erp-label">Company :</label>
                <input
                  type="text"
                  className="erp-input erp-flex-1"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {/* Right Area: Invoice Metadata */}
          <div className="erp-meta-container">
            <div className="erp-form-rows">
              {/* Invoice No. & Recent Invoice No. */}
              <div className="erp-form-row erp-meta-invoiceno-row">
                <label className="erp-label required">Invoice No. *</label>
                <input
                  type="text"
                  className="erp-input erp-w-140"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
                <span className="erp-recent-invoice-text">Recent Invoice No : {recentInvoiceNo}</span>
              </div>

              {/* Date & Time */}
              <div className="erp-form-row erp-date-time-row">
                <label className="erp-label required">Date *</label>
                <div className="erp-date-time-inputs">
                  <input
                    type="date"
                    className="erp-input erp-w-130"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                  <span className="erp-meta-sublabel">Time</span>
                  <input
                    type="time"
                    className="erp-input erp-w-90"
                    value={invoiceTime}
                    onChange={(e) => setInvoiceTime(e.target.value)}
                  />
                </div>
              </div>

              {/* LPO NO */}
              <div className="erp-form-row">
                <label className="erp-label">LPO NO</label>
                <input
                  type="text"
                  className="erp-input erp-w-220"
                  value={lpoNo}
                  onChange={(e) => setLpoNo(e.target.value)}
                />
              </div>

              {/* Sales Man */}
              <div className="erp-form-row erp-rel-anchor" ref={salesmanRef}>
                <label className="erp-label">Sales Man</label>
                <div className="erp-input-with-tools erp-flex-1">
                  <select
                    className="erp-select erp-flex-1"
                    value={salesMan}
                    onChange={(e) => setSalesMan(e.target.value)}
                  >
                    <option value="">-Select Sales Man-</option>
                    {salesmen.map((s) => (
                      <option key={s.id || s._id} value={s.name}>
                        {s.name} {s.phone ? `(${s.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`erp-icon-btn erp-btn-orange ${isAddSalesmanOpen ? "active" : ""}`}
                    title="Add New Sales Man to Database"
                    onClick={() => setIsAddSalesmanOpen((prev) => !prev)}
                  >
                    +
                  </button>
                </div>

                {/* Quick Add Salesman Popover */}
                {isAddSalesmanOpen && (
                  <div className="erp-mini-quick-popover" role="dialog" aria-label="Add Salesman">
                    <div className="erp-mini-quick-header">
                      <span>+ Add New Salesman</span>
                      <button type="button" onClick={() => setIsAddSalesmanOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleSaveSalesman} className="erp-mini-quick-body">
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Salesman Name *"
                        value={newSalesmanName}
                        onChange={(e) => setNewSalesmanName(e.target.value)}
                        autoFocus
                        required
                      />
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Mobile / Phone (050-XXXXXXX)"
                        value={newSalesmanPhone}
                        onChange={(e) => setNewSalesmanPhone(e.target.value)}
                      />
                      <div className="erp-mini-quick-actions">
                        <button type="submit" className="erp-btn-save-mini" disabled={isSavingSalesman}>
                          {isSavingSalesman ? "Saving..." : "Save"}
                        </button>
                        <button type="button" className="erp-btn-cancel-mini" onClick={() => setIsAddSalesmanOpen(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Referred By */}
              <div className="erp-form-row erp-rel-anchor" ref={referrerRef}>
                <label className="erp-label">Referred By</label>
                <div className="erp-input-with-tools erp-flex-1">
                  <select
                    className="erp-select erp-flex-1"
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                  >
                    <option value="">-Select Referrer-</option>
                    {referrers.map((r) => (
                      <option key={r.id || r._id} value={r.name}>
                        {r.name} {r.phone ? `(${r.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`erp-icon-btn erp-btn-orange ${isAddReferrerOpen ? "active" : ""}`}
                    title="Add New Referrer to Database"
                    onClick={() => setIsAddReferrerOpen((prev) => !prev)}
                  >
                    +
                  </button>
                </div>

                {/* Quick Add Referrer Popover */}
                {isAddReferrerOpen && (
                  <div className="erp-mini-quick-popover" role="dialog" aria-label="Add Referrer">
                    <div className="erp-mini-quick-header">
                      <span>+ Add New Referrer</span>
                      <button type="button" onClick={() => setIsAddReferrerOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleSaveReferrer} className="erp-mini-quick-body">
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Referrer Name *"
                        value={newReferrerName}
                        onChange={(e) => setNewReferrerName(e.target.value)}
                        autoFocus
                        required
                      />
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Mobile / Phone (050-XXXXXXX)"
                        value={newReferrerPhone}
                        onChange={(e) => setNewReferrerPhone(e.target.value)}
                      />
                      <div className="erp-mini-quick-actions">
                        <button type="submit" className="erp-btn-save-mini" disabled={isSavingReferrer}>
                          {isSavingReferrer ? "Saving..." : "Save"}
                        </button>
                        <button type="button" className="erp-btn-cancel-mini" onClick={() => setIsAddReferrerOpen(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Division */}
              <div className="erp-form-row erp-rel-anchor" ref={divisionRef}>
                <label className="erp-label">Division</label>
                <div className="erp-input-with-tools erp-flex-1">
                  <select
                    className="erp-select erp-flex-1"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                  >
                    <option value="">-Select Division-</option>
                    {divisions.map((d) => (
                      <option key={d.id || d._id} value={d.name}>
                        {d.name} {d.code ? `[${d.code}]` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`erp-icon-btn erp-btn-orange ${isAddDivisionOpen ? "active" : ""}`}
                    title="Add New Division to Database"
                    onClick={() => setIsAddDivisionOpen((prev) => !prev)}
                  >
                    +
                  </button>
                </div>

                {/* Quick Add Division Popover */}
                {isAddDivisionOpen && (
                  <div className="erp-mini-quick-popover" role="dialog" aria-label="Add Division">
                    <div className="erp-mini-quick-header">
                      <span>+ Add New Division</span>
                      <button type="button" onClick={() => setIsAddDivisionOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleSaveDivision} className="erp-mini-quick-body">
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Division Name *"
                        value={newDivisionName}
                        onChange={(e) => setNewDivisionName(e.target.value)}
                        autoFocus
                        required
                      />
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="Code / Identifier (e.g. DIV-01)"
                        value={newDivisionCode}
                        onChange={(e) => setNewDivisionCode(e.target.value)}
                      />
                      <div className="erp-mini-quick-actions">
                        <button type="submit" className="erp-btn-save-mini" disabled={isSavingDivision}>
                          {isSavingDivision ? "Saving..." : "Save"}
                        </button>
                        <button type="button" className="erp-btn-cancel-mini" onClick={() => setIsAddDivisionOpen(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* User indicator */}
              <div className="erp-user-indicator-row">
                <span className="erp-user-label">User : </span>
                <span className="erp-user-val">{currentUser}</span>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            SECTION 2: DETAILS FIELDSET (Line Items & Grid)
            ------------------------------------------------------------- */}
        <fieldset className="erp-fieldset erp-details-fieldset">
          <legend className="erp-legend">Details</legend>

          {/* Top Line Item Input Row */}
          <div className="erp-details-top-bar">
            {/* Type */}
            <div className="erp-inline-field">
              <label className="erp-micro-label">Type</label>
              <select
                className="erp-select erp-w-90"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
              >
                <option value="Service">Service</option>
                <option value="Product">Product</option>
                <option value="GovtFee">Govt Fee</option>
              </select>
            </div>

            {/* Description Dropdown + Freely Editable Input */}
            <div className="erp-inline-field erp-flex-1">
              <label className="erp-micro-label">&nbsp;</label>
              <div className="erp-service-inputs-combo">
                <select
                  className="erp-select erp-service-picker-select"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const s = servicesList.find((srv) => (srv.id || srv._id || srv.slug) === val);
                    if (s) {
                      setItemDesc(s.name);
                      setItemPackageCode(s.serviceId || s.slug || "SRV-01");
                    }
                  }}
                  title="Choose from Service Catalog"
                >
                  <option value="">▼ Select from Services</option>
                  {servicesList.map((srv) => (
                    <option key={srv.id || srv._id || srv.slug} value={srv.id || srv._id || srv.slug}>
                      {srv.serviceId ? `[${srv.serviceId}] ` : ""}{srv.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="erp-input erp-flex-1"
                  placeholder="Service / Package Description (freely editable or type new)..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                />
              </div>
            </div>

            {/* Qty */}
            <div className="erp-inline-field">
              <label className="erp-micro-label">Qty</label>
              <input
                type="number"
                className="erp-input erp-w-60 text-center"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value ? Number(e.target.value) : "")}
              />
            </div>

            {/* Unit Price */}
            <div className="erp-inline-field">
              <label className="erp-micro-label">Unit Price</label>
              <input
                type="number"
                className="erp-input erp-w-90 text-right"
                value={itemUnitPrice}
                onChange={(e) => setItemUnitPrice(e.target.value ? Number(e.target.value) : "")}
              />
            </div>

            {/* Amount */}
            <div className="erp-inline-field">
              <label className="erp-micro-label">Amount</label>
              <input
                type="number"
                className="erp-input erp-w-100 text-right"
                value={itemAmount}
                onChange={(e) => setItemAmount(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
          </div>

          {/* Sub Row: Employee, RA, Govt Fee, Bank, Supplier */}
          <div className="erp-details-mid-bar">
            {/* Employee (Worker Admin) */}
            <div className="erp-inline-group erp-rel-anchor" ref={employeeRef}>
              <span className="erp-mini-tag">Employee</span>
              <div className="erp-input-with-tools">
                <select
                  className="erp-select erp-w-160"
                  value={itemEmployee}
                  onChange={(e) => setItemEmployee(e.target.value)}
                >
                  <option value="">-Select Employee-</option>
                  {workerEmployees.map((w) => (
                    <option key={w.id} value={w.name || w.identifier}>
                      {w.name ? `${w.name} (${w.identifier.split("@")[0]})` : w.identifier}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`erp-icon-btn erp-btn-orange ${isAddEmployeeOpen ? "active" : ""}`}
                  title="Add New Employee (Worker Admin)"
                  onClick={() => setIsAddEmployeeOpen((prev) => !prev)}
                >
                  +
                </button>
              </div>

              {/* Quick Add Employee Popover */}
              {isAddEmployeeOpen && (
                <div className="erp-mini-quick-popover" role="dialog" aria-label="Add Employee">
                  <div className="erp-mini-quick-header">
                    <span>+ Add New Employee</span>
                    <button type="button" onClick={() => setIsAddEmployeeOpen(false)}>✕</button>
                  </div>
                  <form onSubmit={handleSaveEmployee} className="erp-mini-quick-body">
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Employee Full Name *"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      autoFocus
                      required
                    />
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Mobile / Phone (050-XXXXXXX)"
                      value={newEmployeePhone}
                      onChange={(e) => setNewEmployeePhone(e.target.value)}
                    />
                    <div className="erp-mini-quick-actions">
                      <button type="submit" className="erp-btn-save-mini" disabled={isSavingEmployee}>
                        {isSavingEmployee ? "Saving..." : "Save"}
                      </button>
                      <button type="button" className="erp-btn-cancel-mini" onClick={() => setIsAddEmployeeOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* RA (Cyan) */}
            <div className="erp-inline-group">
              <span className="erp-mini-tag">RA</span>
              <input
                type="text"
                className="erp-input erp-w-90 erp-bg-cyan"
                value={itemRa}
                onChange={(e) => setItemRa(e.target.value)}
              />
            </div>

            {/* Govt Fee Paid By Customer Checkbox + Yellow Input */}
            <div className="erp-inline-group">
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={govtFeePaidByCustomer}
                  onChange={(e) => setGovtFeePaidByCustomer(e.target.checked)}
                />
                <span>Govt Fee Paid By Customer</span>
              </label>
              <input
                type="text"
                className="erp-input erp-w-90 erp-bg-yellow"
                value={govtFeeAmount}
                onChange={(e) => setGovtFeeAmount(e.target.value)}
              />
            </div>

            {/* Bank + C (Yellow) */}
            <div className="erp-inline-group erp-rel-anchor" ref={bankRef}>
              <span className="erp-mini-tag">Bank</span>
              <div className="erp-input-with-tools">
                <select
                  className="erp-select erp-w-130"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                >
                  <option value="">-Select One-</option>
                  {bankList.map((b) => (
                    <option key={b.id || b._id} value={b.bankName}>
                      {b.bankName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`erp-icon-btn erp-btn-orange ${isAddBankOpen ? "active" : ""}`}
                  title="Add New Bank to Database"
                  onClick={() => setIsAddBankOpen((prev) => !prev)}
                >
                  +
                </button>
              </div>
              <span className="erp-mini-subtag">C</span>
              <input
                type="text"
                className="erp-input erp-w-60 erp-bg-yellow"
                value={bankC}
                onChange={(e) => setBankC(e.target.value)}
              />

              {/* Quick Add Bank Popover */}
              {isAddBankOpen && (
                <div className="erp-mini-quick-popover" role="dialog" aria-label="Add Bank">
                  <div className="erp-mini-quick-header">
                    <span>+ Add New Bank</span>
                    <button type="button" onClick={() => setIsAddBankOpen(false)}>✕</button>
                  </div>
                  <form onSubmit={handleSaveBank} className="erp-mini-quick-body">
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Bank Name * (e.g. ADCB)"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      autoFocus
                      required
                    />
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Account Number / IBAN"
                      value={newBankAccountNo}
                      onChange={(e) => setNewBankAccountNo(e.target.value)}
                    />
                    <div className="erp-mini-quick-actions">
                      <button type="submit" className="erp-btn-save-mini" disabled={isSavingBank}>
                        {isSavingBank ? "Saving..." : "Save"}
                      </button>
                      <button type="button" className="erp-btn-cancel-mini" onClick={() => setIsAddBankOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Supplier + C (Yellow) */}
            <div className="erp-inline-group erp-rel-anchor" ref={supplierRef}>
              <span className="erp-mini-tag">Supplier</span>
              <div className="erp-input-with-tools">
                <select
                  className="erp-select erp-w-130"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                >
                  <option value="">-Select One-</option>
                  {suppliers.map((s) => (
                    <option key={s.id || s._id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`erp-icon-btn erp-btn-orange ${isAddSupplierOpen ? "active" : ""}`}
                  title="Add New Supplier to Database"
                  onClick={() => setIsAddSupplierOpen((prev) => !prev)}
                >
                  +
                </button>
              </div>
              <span className="erp-mini-subtag">C</span>
              <input
                type="text"
                className="erp-input erp-w-60 erp-bg-yellow"
                value={supplierC}
                onChange={(e) => setSupplierC(e.target.value)}
              />

              {/* Quick Add Supplier Popover */}
              {isAddSupplierOpen && (
                <div className="erp-mini-quick-popover" role="dialog" aria-label="Add Supplier">
                  <div className="erp-mini-quick-header">
                    <span>+ Add New Supplier</span>
                    <button type="button" onClick={() => setIsAddSupplierOpen(false)}>✕</button>
                  </div>
                  <form onSubmit={handleSaveSupplier} className="erp-mini-quick-body">
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Supplier Name * (e.g. Amer)"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      autoFocus
                      required
                    />
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Mobile / Contact"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                    />
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Code / TRN"
                      value={newSupplierCode}
                      onChange={(e) => setNewSupplierCode(e.target.value)}
                    />
                    <div className="erp-mini-quick-actions">
                      <button type="submit" className="erp-btn-save-mini" disabled={isSavingSupplier}>
                        {isSavingSupplier ? "Saving..." : "Save"}
                      </button>
                      <button type="button" className="erp-btn-cancel-mini" onClick={() => setIsAddSupplierOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Table & Right Buttons Row */}
          <div className="erp-table-with-actions">
            <div className="erp-table-scroll-wrap">
              <table className="erp-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="erp-th-blue">SlNo.</th>
                    <th style={{ width: "110px" }}>Package Code.</th>
                    <th style={{ minWidth: "200px" }}>Description</th>
                    <th style={{ width: "60px" }}>Qty</th>
                    <th style={{ width: "90px" }}>Unit Price</th>
                    <th style={{ width: "100px" }}>Total Amount</th>
                    <th style={{ width: "110px" }}>Employee</th>
                    <th style={{ width: "90px" }}>cost_pr...</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="erp-table-empty-td">
                        No service line items added. Fill details above and click <strong>+ Add</strong>.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item) => (
                      <tr
                        key={item.id}
                        className={selectedRowId === item.id ? "selected-row" : ""}
                        onClick={() => setSelectedRowId(item.id)}
                      >
                        <td className="text-center">{item.slNo}</td>
                        <td>{item.packageCode}</td>
                        <td>{item.description}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-right">{item.unitPrice.toFixed(2)}</td>
                        <td className="text-right font-semibold">{item.totalAmount.toFixed(2)}</td>
                        <td>{item.employee}</td>
                        <td className="text-right">{item.costPrice.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Action Buttons */}
            <div className="erp-table-side-buttons">
              <button
                type="button"
                className="erp-side-btn erp-btn-add"
                onClick={handleAddItem}
              >
                <span className="btn-icon">✚</span>
                <span>Add</span>
              </button>
              <button
                type="button"
                className="erp-side-btn erp-btn-remove"
                onClick={handleRemoveItem}
              >
                <span className="btn-icon">▬</span>
                <span>Remove</span>
              </button>
              <button
                type="button"
                className="erp-side-btn erp-btn-change"
                onClick={handleChangeItem}
              >
                <span className="btn-icon">✎</span>
                <span>Change</span>
              </button>
            </div>
          </div>
        </fieldset>

        {/* -------------------------------------------------------------
            SECTION 3: PAYMENT DETAILS FIELDSET
            ------------------------------------------------------------- */}
        <fieldset className="erp-fieldset erp-payment-fieldset">
          <legend className="erp-legend">Payment Details</legend>
          <div className="erp-payment-grid">
            {/* Left Box: Notes, Description, Paid methods */}
            <div className="erp-pay-left-col">
              <div className="erp-notes-container">
                <button type="button" className="erp-notes-box-btn" title="Add Notes">
                  <div className="notes-icon-wrap">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                      <rect x="5" y="3" width="14" height="18" rx="2" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                      <line x1="8" y1="8" x2="16" y2="8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="8" y1="12" x2="16" y2="12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="8" y1="16" x2="13" y2="16" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="notes-text">Notes</span>
                </button>

                <div className="erp-pay-fields">
                  <div className="erp-form-row">
                    <label className="erp-label-sm font-bold">Description</label>
                    <select
                      className="erp-select erp-flex-1 erp-bg-yellow"
                      value={payDescription}
                      onChange={(e) => setPayDescription(e.target.value)}
                    >
                      <option value="">-Select One-</option>
                      <option value="full_payment">Full Settlement</option>
                      <option value="advance_payment">Advance Received</option>
                      <option value="govt_fee_only">Govt Fees Only</option>
                    </select>
                  </div>

                  <div className="erp-form-row">
                    <label className="erp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={adjustAdvance}
                        onChange={(e) => setAdjustAdvance(e.target.checked)}
                      />
                      <span>Adjust Advance</span>
                    </label>
                  </div>

                  <div className="erp-form-row">
                    <span className="erp-label-sm">Govt Fee Paid By Customer</span>
                    <input
                      type="text"
                      className="erp-input erp-w-100 erp-bg-yellow text-right"
                      value={payGovtFee}
                      onChange={(e) => setPayGovtFee(e.target.value)}
                    />
                  </div>

                  <div className="erp-form-row erp-mt-8">
                    <span className="erp-label-sm font-bold">Paid</span>
                    <select
                      className="erp-select erp-w-130 erp-bg-yellow"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      <option value="">-Select One-</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card / POS</option>
                      <option value="transfer">Bank Transfer</option>
                    </select>
                    <span className="erp-label-sm font-bold">Cash</span>
                    <input
                      type="text"
                      className="erp-input erp-w-80 erp-bg-lightgreen text-right"
                      value={payCash}
                      onChange={(e) => setPayCash(e.target.value)}
                    />
                    <span className="erp-label-sm font-bold">CC</span>
                    <input
                      type="text"
                      className="erp-input erp-w-80 erp-bg-lightgreen text-right"
                      value={payCc}
                      onChange={(e) => setPayCc(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Center Box: Costs and Intermediate Totals */}
            <div className="erp-pay-center-col">
              <div className="erp-cost-row">
                <span className="erp-cost-label font-bold">Total Bank Cost</span>
                <input
                  type="text"
                  className="erp-input erp-w-100 erp-bg-yellow text-right font-semibold"
                  value={totalBankCost}
                  onChange={(e) => setTotalBankCost(e.target.value)}
                />
              </div>

              <div className="erp-cost-row">
                <span className="erp-cost-label font-bold">Total Supplier Cost</span>
                <input
                  type="text"
                  className="erp-input erp-w-100 erp-bg-yellow text-right font-semibold"
                  value={totalSupplierCost}
                  onChange={(e) => setTotalSupplierCost(e.target.value)}
                />
              </div>

              <div className="erp-cost-row">
                <span className="erp-cost-label font-bold">M</span>
                <input
                  type="text"
                  className="erp-input erp-w-100 erp-bg-pink text-right font-semibold"
                  value={costM}
                  onChange={(e) => setCostM(e.target.value)}
                />
              </div>

              <div className="erp-cost-row erp-mt-8">
                <span className="erp-cost-label font-bold">Total</span>
                <input
                  type="text"
                  className="erp-input erp-w-130 text-right font-semibold"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </div>

              <div className="erp-cost-row">
                <span className="erp-cost-label font-bold">Discount (%)</span>
                <input
                  type="text"
                  className="erp-input erp-w-100 text-right"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>

              <div className="erp-cost-row">
                <span className="erp-cost-label font-bold">Taxable Amount</span>
                <input
                  type="text"
                  className="erp-input erp-w-100 erp-bg-lightgreen text-right font-semibold"
                  value={taxableAmount}
                  onChange={(e) => setTaxableAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Right Box: Final Totals, VAT, Gross, Paid, Balance */}
            <div className="erp-pay-right-col">
              <div className="erp-summary-row">
                <span className="erp-summary-label font-bold">Discount</span>
                <input
                  type="text"
                  className="erp-input erp-w-110 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="erp-summary-row">
                <span className="erp-summary-label font-bold">Total Before VAT</span>
                <input
                  type="text"
                  readOnly
                  className="erp-input erp-w-110 text-right font-semibold bg-gray-50"
                  value={totalBeforeVat}
                />
              </div>

              <div className="erp-summary-row">
                <span className="erp-summary-label font-bold">VAT</span>
                <input
                  type="text"
                  className="erp-input erp-w-110 erp-bg-purple text-right font-semibold"
                  value={vat}
                  onChange={(e) => setVat(e.target.value)}
                />
              </div>

              <div className="erp-summary-row">
                <span className="erp-summary-label font-bold">Gross Amount</span>
                <input
                  type="text"
                  readOnly
                  className="erp-input erp-w-110 text-right font-bold bg-gray-50"
                  value={grossAmount}
                />
              </div>

              <div className="erp-summary-row">
                <span className="erp-summary-label font-bold">Paid</span>
                <input
                  type="text"
                  className="erp-input erp-w-110 text-right font-semibold"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                />
              </div>

              <div className="erp-summary-row">
                <span className="erp-summary-label font-bold">Balance</span>
                <input
                  type="text"
                  readOnly
                  className="erp-input erp-w-110 text-right font-bold"
                  value={balance}
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* -------------------------------------------------------------
            SECTION 4: BOTTOM COMMAND TOOLBAR
            ------------------------------------------------------------- */}
        <div className="erp-footer-bar">
          <div className="erp-action-buttons">
            {/* Save */}
            <button
              type="button"
              className="erp-footer-btn"
              onClick={handleSaveInvoice}
              disabled={isSavingInvoice}
              title="Save Invoice & Increment Sequence in MongoDB"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{isSavingInvoice ? "Saving..." : "Save"}</span>
            </button>

            {/* Print */}
            <button
              type="button"
              className="erp-footer-btn"
              onClick={handlePrintCurrentInvoice}
              title="Print Active Invoice or Preview Document"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#d97706" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span>Print</span>
            </button>

            {/* Edit / Quick Load */}
            <button
              type="button"
              className="erp-footer-btn"
              onClick={() => {
                if (invoicesLedger.length > 0) {
                  handleLoadInvoice(invoicesLedger[0]);
                } else {
                  alert("No recent invoices in database to edit.");
                }
              }}
              title="Edit / Load Recent Invoice"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0891b2" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Edit</span>
            </button>

            {/* Search */}
            <button
              type="button"
              className="erp-footer-btn"
              onClick={() => {
                setIsCustomerSearchOpen(true);
              }}
              title="Search Customers & Invoices"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#475569" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search</span>
            </button>

            {/* Reset */}
            <button
              type="button"
              className="erp-footer-btn"
              onClick={() => {
                setLineItems([]);
                setCustomer("");
                setMobile("");
                setCode("");
                setAddress("");
                setEmail("");
                setCompany("");
                setTotal("");
                setGrossAmount("0.00");
                setPaid("0.00");
                setBalance("0.00");
                setInvoiceBannerMsg(null);
              }}
              title="Reset Form"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span style={{ color: "#2563eb" }}>Reset</span>
            </button>

            {/* Close */}
            <button type="button" className="erp-footer-btn" onClick={onClose} title="Close Window">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ea580c" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span style={{ color: "#ea580c" }}>Close</span>
            </button>
          </div>

          {/* Right: Bank Details Checkbox */}
          <div className="erp-footer-right">
            <label className="erp-checkbox-label font-bold">
              <input
                type="checkbox"
                checked={bankDetailsChecked}
                onChange={(e) => setBankDetailsChecked(e.target.checked)}
              />
              <span>Bank Details</span>
            </label>
          </div>
        </div>

        {/* Printable Invoice Modal Preview */}
        {activePrintInvoice && (
          <PrintableInvoiceModal
            invoice={activePrintInvoice}
            onClose={() => setActivePrintInvoice(null)}
          />
        )}
      </div>
    </div>
  );
}
