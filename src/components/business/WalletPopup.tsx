
import { useEffect, useMemo, useState, useCallback } from "react";
import { CreditCard, Landmark, Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { parseCurrencyInput } from "@/lib/business-storage";
import { formatCurrency } from "@/lib/formatters";
import type { Platform, WalletData, WalletPocket } from "@/lib/types";
import { useWallet } from "@/firebase/client-provider";

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
  const { walletData, vendasPendentesApps, addTransaction, updateWalletBalance, clearPendingAppSales, isLoadingWallet } = useWallet();
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [draft, setDraft] = useState<TransactionDraft>({
    categoria: "",
    outro: "",
    valor: "",
    bolso: "banco",
    descricao: "",
  });
  const [isConfirmingRepasse, setIsConfirmingRepasse] = useState(false);
  const [platformToRepasse, setPlatformToRepasse] = useState<Platform | null>(null);
  const [repassePocket, setRepassePocket] = useState<WalletPocket>("banco");

  const total = useMemo(() => (walletData ? walletData.banco + walletData.caixa : 0), [walletData]);
  const categories = flowType === "entrada" ? entradaCategorias : saidaCategorias;

  const resetDraft = useCallback((type: FlowType) => {
    setFlowType(type);
    setDraft({
      categoria: "",
      outro: "",
      valor: "",
      bolso: type === "saida" ? "caixa" : "banco",
      descricao: "",
    });
  }, []);

  const handleTransactionSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!flowType || !walletData) return;

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

    if (flowType === "saida" && walletData[draft.bolso] < valor) {
      toast({
        title: "Saldo insuficiente",
        description: `O bolso ${draft.bolso} não possui saldo suficiente.`,
        variant: "destructive",
      });
      return;
    }

    await addTransaction({
      tipo: flowType,
      categoria: categoriaBase,
      descricao: draft.descricao.trim() || categoriaBase,
      valor,
      bolso: draft.bolso,
    });

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
  }, [flowType, walletData, draft, addTransaction, toast]);

  const handleReceiveRepasse = useCallback(async () => {
    if (!platformToRepasse || !vendasPendentesApps || !vendasPendentesApps[platformToRepasse.id]) return;

    const pending = vendasPendentesApps[platformToRepasse.id];

    await addTransaction({
      tipo: "entrada",
      categoria: "Repasse de Aplicativo",
      descricao: `Repasse de vendas do aplicativo ${platformToRepasse.nome}`,
      valor: pending.totalLiquido,
      bolso: repassePocket,
    });

    await clearPendingAppSales(platformToRepasse.id);

    toast({
      title: "Repasse recebido!",
      description: `O valor de ${formatCurrency(pending.totalLiquido)} do ${platformToRepasse.nome} foi adicionado à sua carteira.`,
    });

    setIsConfirmingRepasse(false);
    setPlatformToRepasse(null);
    setRepassePocket("banco");
  }, [platformToRepasse, vendasPendentesApps, addTransaction, clearPendingAppSales, repassePocket, toast]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl border-0 bg-transparent p-0 shadow-none">
          <div className="rounded-[2.25rem] border bg-background/95 p-6 shadow-2xl backdrop-blur md:p-10">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-2xl md:text-3xl">
                <CreditCard className="h-6 w-6 text-primary" />
                Carteira
              </DialogTitle>
              <DialogDescription>Banco e caixa separados em um único painel com lançamento manual.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <div className="wallet-card-container min-h-[420px] md:min-h-[520px]">
                  <div className="wallet-card relative w-full h-full rounded-[2rem] border border-primary/20 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10">
                    {/* Cartão Frontal */}
                    <div className="w-full h-full p-8 md:p-10">
                      <div className="wallet-card__shine" />
                      <div className="relative z-10 flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Carteira Digital</p>
                            <h3 className="mt-3 text-3xl font-semibold md:text-4xl">Minha Empresa</h3>
                          </div>
                          <div className="wallet-chip" aria-hidden="true" />
                        </div>

                        <div>
                          <p className="text-base text-white/70">Saldo total</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="mt-3 text-left text-5xl font-bold tracking-tight md:text-6xl">
                                {formatCurrency(total)}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="space-y-1">
                              <p className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Banco: {formatCurrency(walletData?.banco || 0)}</p>
                              <p className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Caixa: {formatCurrency(walletData?.caixa || 0)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button type="button" size="lg" variant="secondary" onClick={(e) => { e.stopPropagation(); resetDraft("entrada"); }}>
                            <ArrowDownCircle className="mr-2 h-4 w-4" />
                            Registrar Entrada
                          </Button>
                          <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            onClick={(e) => { e.stopPropagation(); resetDraft("saida"); }}
                          >
                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                            Registrar Saída
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border bg-card/70 p-5">
                    <p className="text-sm text-muted-foreground">Banco</p>
                    <p className="mt-2 text-3xl font-semibold">{formatCurrency(walletData?.banco || 0)}</p>
                  </div>
                  <div className="rounded-2xl border bg-card/70 p-5">
                    <p className="text-sm text-muted-foreground">Caixa</p>
                    <p className="mt-2 text-3xl font-semibold">{formatCurrency(walletData?.caixa || 0)}</p>
                  </div>
                </div>

                {Object.keys(vendasPendentesApps || {}).length > 0 && (
                  <div className="rounded-2xl border bg-card/60 p-5">
                    <p className="font-semibold">💳 Valores Retidos — Aguardando Repasse</p>
                    <div className="mt-4 space-y-3">
                      {Object.entries(vendasPendentesApps || {}).map(([platformId, pending]) => (
                        <div key={platformId} className="rounded-xl border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{platformId}</p>
                              <p className="text-xs text-muted-foreground">Total Bruto: {formatCurrency(pending.totalBruto)}</p>
                              <p className="text-xs text-muted-foreground">Comissão: {pending.comissao}%</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">{formatCurrency(pending.totalLiquido)}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1"
                                onClick={() => {
                                  setPlatformToRepasse({ id: platformId, nome: platformId, cobraTaxa: false, taxa: 0, isApp: true, comissaoMensal: pending.comissao });
                                  setIsConfirmingRepasse(true);
                                }}
                              >
                                <RefreshCcw className="mr-1 h-3 w-3" /> Receber Repasse
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border bg-card/60 p-5">
                  <p className="font-semibold">Últimas transações</p>
                  <div className="mt-4 space-y-3">
                    {walletData?.transacoes.length ? (
                      walletData.transacoes.slice(0, 7).map((transaction) => (
                        <div key={transaction.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                          <div>
                            <p className="font-medium">{transaction.categoria}</p>
                            <p className="text-xs text-muted-foreground">{transaction.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className={transaction.tipo === "entrada" ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                              {transaction.tipo === "entrada" ? "+" : "-"} {formatCurrency(transaction.valor)}
                            </p>
                            <p className="text-xs text-muted-foreground">{transaction.bolso === "banco" ? "Banco" : "Caixa"}</p>
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

      {/* Dialog para Entrada/Saída Manual */}
      <Dialog open={flowType !== null} onOpenChange={(open) => !open && setFlowType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{flowType === "entrada" ? "Registrar Entrada Manual" : "Registrar Saída Manual"}</DialogTitle>
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

      {/* Dialog de Confirmação de Repasse */}
      <Dialog open={isConfirmingRepasse} onOpenChange={setIsConfirmingRepasse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Repasse</DialogTitle>
            <DialogDescription>
              Confirme o recebimento do repasse do aplicativo {platformToRepasse?.nome}.
            </DialogDescription>
          </DialogHeader>
          {platformToRepasse && vendasPendentesApps && vendasPendentesApps[platformToRepasse.id] && (
            <div className="space-y-2">
              <p>Total Líquido a Receber: <span className="font-semibold">{formatCurrency(vendasPendentesApps[platformToRepasse.id].totalLiquido)}</span></p>
              <div className="space-y-2">
                <Label>Receber em</Label>
                <Select value={repassePocket} onValueChange={(value: WalletPocket) => setRepassePocket(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="banco">Banco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingRepasse(false)}>Cancelar</Button>
            <Button onClick={handleReceiveRepasse}>Confirmar Repasse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
