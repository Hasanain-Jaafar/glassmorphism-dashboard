"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const avgSalesMethods = [
  { value: "monthly-active-reps", label: "Monthly paid sales ÷ active reps" },
  {
    value: "yearly-active-reps",
    label: "Year-to-date paid sales ÷ active reps",
  },
];

export function CompanyDefaultsSection() {
  const [companyName, setCompanyName] = useState("Sales Dashboard");
  const [fiscalYearStart, setFiscalYearStart] = useState("January");
  const [avgSalesMethod, setAvgSalesMethod] = useState(
    avgSalesMethods[0].value
  );

  function handleSave() {
    toast.success("Company defaults saved");
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">
        Company Defaults
      </h3>
      <p className="mt-0.5 text-xs text-text-tertiary">
        Business rules used across dashboards and reports.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-currency">Currency</Label>
          <Input id="company-currency" value="USD ($)" disabled />
          <p className="text-xs text-text-tertiary">
            Fixed for this dashboard.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Fiscal Year Start</Label>
          <Select
            value={fiscalYearStart}
            onValueChange={(value) => value && setFiscalYearStart(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Avg. Sales / Rep Calculation</Label>
          <Select
            value={avgSalesMethod}
            onValueChange={(value) => value && setAvgSalesMethod(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string) =>
                  avgSalesMethods.find((method) => method.value === value)
                    ?.label ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {avgSalesMethods.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave}>Save Defaults</Button>
      </div>
    </div>
  );
}
