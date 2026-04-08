"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonForm } from "./PersonForm";

export function NewPersonButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Nova Pessoa
      </Button>
      {open && <PersonForm onClose={() => setOpen(false)} />}
    </>
  );
}
