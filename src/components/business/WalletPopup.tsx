"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Landmark, Wallet, ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  createWalletTransaction,
  formatCurrencyBRL,
  getCardInfo,
  getPocketLabel,
  getWallet,
  getWalletTotal,
  parseCurrencyInput,
  registerWalletTransaction,
  saveCardInfo,
} from "@/lib/business-storage";
import type { CardInfo, WalletData, WalletPocket } from "@/lib/types";

type FlowType = "entrada" | "saida" | null;

type TransactionDraft = {
  categoria: string;
  outro: string;
  valor: string;
  bolso: WalletPocket;
  descricao: string;
};

const entradaCategorias = [
  "Venda de Produto",
  "Entrada de Dinheiro em Caixa (papel)",
  "Investimento pelos Proprietários",
  "Outro",
];

const saidaCategorias = [
  "Emergência",
  "Compra de Insumo/Ingrediente",
  "Despesa Operacional",
  "Retirada dos Proprietários",
  "Outro",
];

export function WalletPopup({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletData>(getWallet());
  const [cardInfo, setCardInfo] = useState<CardInfo>(getCardInfo());
  const [isFlipped, setIsFlipped] = useState(false);
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [draft, setDraft] = useState<TransactionDraft>({
    categoria: "",
    outro: "",
    valor: "",
    bolso: "banco",
    descricao: "",
  });
  const [editingField, setEditingField] = useState<keyof CardInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    setWallet(getWallet());
    setCardInfo(getCardInfo());
  }, [open]);

  const total = useMemo(() => getWalletTotal(wallet), [wallet]);
  const categories = flowType === "entrada" ? entradaCategorias : saidaCategorias;

  const resetDraft = (type: FlowType) => {
    setFlowType(type);
    setDraft({
      categoria: "",
      outro: "",
      valor: "",
      bolso: type === "saida" ? "caixa" : "banco",
      descricao: "",
    });
  };

  const handleCardInfoSave = (field: keyof CardInfo, value: string) => {
    const nextInfo = { ...cardInfo, [field]: value };
    setCardInfo(nextInfo);
    saveCardInfo(nextInfo);
    setEditingField(null);
  };

  const handleTransactionSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!flowType) return;

    const valor = parseCurrencyInput(draft.valor);
    const categoriaBase = draft.categoria === "Outro" ? draft.outro.trim() : draft.categoria;

    if (!categoriaBase || Number.isNaN(valor) || valor <= 0) {
      toast({
        title: "Dados inválidos",
        description: "Preencha a categoria e informe um valor válido.",
        variant: "destructive",
      });
      return;
    }

    if (flowType === "saida" && wallet[draft.bolso] < valor) {
      toast({
        title: "Saldo insuficiente",
        description: `O bolso ${getPocketLabel(draft.bolso).toLowerCase()} não possui saldo suficiente.`,
        variant: "destructive",
      });
      return;
    }

    const transaction = createWalletTransaction({
      tipo: flowType,
      categoria: categoriaBase,
      descricao: draft.descricao.trim() || categoriaBase,
      valor,
      bolso: draft.bolso,
    });

    const nextWallet = registerWalletTransaction(transaction);
    setWallet(nextWallet);
    setFlowType(null);
    setDraft({
      categoria: "",
      outro: "",
      valor: "",
      bolso: "banco",
      descricao: "",
    });

    toast({
      title: flowType === "entrada" ? "Entrada registrada" : "Saída registrada",
      description: "A carteira foi atualizada com sucesso.",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none">
          <div className="rounded-[2rem] border bg-background/95 p-5 shadow-2xl backdrop-blur md:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CreditCard className="h-6 w-6 text-primary" />
                Carteira
              </DialogTitle>
              <DialogDescription>Banco e caixa separados em um único painel com lançamento manual.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="perspective-[1600px]">
                <div
                  className={`relative min-h-[320px] w-full transition-transform duration-700 [transform-style:preserve-3d] ${
                    isFlipped ? "[transform:rotateY(180deg)]" : ""
                  }`}
                >
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    <div className="wallet-card relative h-full overflow-hidden rounded-[1.75rem] border border-white/15 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                      <div className="wallet-card__shine" />
                      <div className="relative z-10 flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Carteira Digital</p>
                            <h3 className="mt-2 text-2xl font-semibold">{cardInfo.nomeNegocio || "Minha Empresa"}</h3>
                          </div>
                          <div className="wallet-chip" aria-hidden="true" />
                        </div>

                        <div>
                          <p className="text-sm text-white/70">Saldo total</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="mt-2 text-left text-4xl font-bold tracking-tight">
                                {formatCurrencyBRL(total)}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="space-y-1">
                              <p className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Banco: {formatCurrencyBRL(wallet.banco)}</p>
                              <p className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Caixa: {formatCurrencyBRL(wallet.caixa)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button type="button" variant="secondary" onClick={() => resetDraft("entrada")}>
                            <ArrowDownCircle className="mr-2 h-4 w-4" />
                            Registrar Entrada
                          </Button>
                          <Button type="button" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => resetDraft("saida")}>
                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                            Registrar Saída
                          </Button>
                          <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setIsFlipped(true)}>
                            Virar Cartão
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-900 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                      <div className="absolute inset-x-0 top-8 h-12 bg-black/50" />
                      <div className="relative z-10 mt-16 space-y-4">
                        <EditableLine
                          label="Nome do Negócio"
                          value={cardInfo.nomeNegocio}
                          isEditing={editingField === "nomeNegocio"}
                          onEdit={() => setEditingField("nomeNegocio")}
                          onSave={(value) => handleCardInfoSave("nomeNegocio", value)}
                        />
                        <EditableLine
                          label="Responsável / Proprietário"
                          value={cardInfo.responsavel}
                          isEditing={editingField === "responsavel"}
                          onEdit={() => setEditingField("responsavel")}
                          onSave={(value) => handleCardInfoSave("responsavel", value)}
                        />
                        <EditableLine
                          label="CNPJ ou CPF"
                          value={cardInfo.documento}
                          isEditing={editingField === "documento"}
                          onEdit={() => setEditingField("documento")}
                          onSave={(value) => handleCardInfoSave("documento", value)}
                        />
                        <EditableLine
                          label="Telefone"
                          value={cardInfo.telefone}
                          isEditing={editingField === "telefone"}
                          onEdit={() => setEditingField("telefone")}
                          onSave={(value) => handleCardInfoSave("telefone", value)}
                        />
                        <EditableLine
                          label="Observações"
                          value={cardInfo.observacoes}
                          isEditing={editingField === "observacoes"}
                          onEdit={() => setEditingField("observacoes")}
                          onSave={(value) => handleCardInfoSave("observacoes", value)}
                        />
                      </div>
                      <div className="relative z-10 flex justify-end">
                        <Button type="button" variant="secondary" onClick={() => setIsFlipped(false)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Voltar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-card/70 p-4">
                    <p className="text-sm text-muted-foreground">Banco</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(wallet.banco)}</p>
                  </div>
                  <div className="rounded-2xl border bg-card/70 p-4">
                    <p className="text-sm text-muted-foreground">Caixa</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(wallet.caixa)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card/60 p-4">
                  <p className="font-semibold">Últimas transações</p>
                  <div className="mt-4 space-y-3">
                    {wallet.transacoes.length ? (
                      wallet.transacoes.slice(0, 6).map((transaction) => (
                        <div key={transaction.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                          <div>
                            <p className="font-medium">{transaction.categoria}</p>
                            <p className="text-xs text-muted-foreground">{transaction.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className={transaction.tipo === "entrada" ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                              {transaction.tipo === "entrada" ? "+" : "-"} {formatCurrencyBRL(transaction.valor)}
                            </p>
                            <p className="text-xs text-muted-foreground">{getPocketLabel(transaction.bolso)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma transação registrada.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={flowType !== null} onOpenChange={(open) => !open && setFlowType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{flowType === "entrada" ? "Registrar Entrada" : "Registrar Saída"}</DialogTitle>
            <DialogDescription>
              {flowType === "entrada"
                ? "Escolha a categoria, o valor e o bolso que receberá a entrada."
                : "Escolha o motivo, o valor e o bolso de origem da saída."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{flowType === "entrada" ? "Tipo de entrada" : "Motivo da saída"}</Label>
              <Select value={draft.categoria} onValueChange={(value) => setDraft((current) => ({ ...current, categoria: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.categoria === "Outro" && (
              <div className="space-y-2">
                <Label htmlFor="wallet-other">Descrição livre</Label>
                <Input
                  id="wallet-other"
                  value={draft.outro}
                  onChange={(event) => setDraft((current) => ({ ...current, outro: event.target.value }))}
                  placeholder="Descreva a categoria"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="wallet-value">Valor (R$)</Label>
              <Input
                id="wallet-value"
                value={draft.valor}
                onChange={(event) => setDraft((current) => ({ ...current, valor: event.target.value }))}
                placeholder="Ex: 120,00"
              />
            </div>

            <div className="space-y-2">
              <Label>{flowType === "entrada" ? "Destino" : "Origem"}</Label>
              <Select
                value={draft.bolso}
                onValueChange={(value) => setDraft((current) => ({ ...current, bolso: value as WalletPocket }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-note">Descrição/Observação</Label>
              <Textarea
                id="wallet-note"
                value={draft.descricao}
                onChange={(event) => setDraft((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Opcional"
              />
            </div>

            <Button type="submit" className="w-full">
              {flowType === "entrada" ? "Registrar Entrada" : "Registrar Saída"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditableLine({
  label,
  value,
  isEditing,
  onEdit,
  onSave,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">{label}</p>
      {isEditing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onSave(draft)}
          className="mt-1 border-white/20 bg-white/10 text-white"
        />
      ) : (
        <button type="button" onClick={onEdit} className="mt-1 text-left text-sm text-white/90">
          {value || "Clique para editar"}
        </button>
      )}
    </div>
  );
}
