"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, PlusCircle, Store, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  createId,
  getMarkets,
  getPlatforms,
  parseCurrencyInput,
  saveMarkets,
  savePlatforms,
} from "@/lib/business-storage";
import type { Market, Platform } from "@/lib/types";

type CategoryMode = "platforms" | "markets";

type PlatformDraft = {
  id?: string;
  nome: string;
  cobraTaxa: boolean;
  taxa: string;
  isApp?: boolean;
  comissaoMensal?: string;
};

type MarketDraft = {
  id?: string;
  nome: string;
};

export function CategoriesManager({ mode }: { mode: CategoryMode }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Platform[] | Market[]>([]);
  const [platformDraft, setPlatformDraft] = useState<PlatformDraft>({ nome: "", cobraTaxa: false, taxa: "" });
  const [marketDraft, setMarketDraft] = useState<MarketDraft>({ nome: "" });

  const isPlatform = mode === "platforms";

  useEffect(() => {
    setItems(isPlatform ? getPlatforms() : getMarkets());
  }, [isPlatform]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [items]
  );

  const resetDraft = () => {
    setPlatformDraft({ nome: "", cobraTaxa: false, taxa: "", isApp: false, comissaoMensal: "" });
    setMarketDraft({ nome: "" });
  };

  const openNew = () => {
    resetDraft();
    setIsOpen(true);
  };

  const openEdit = (item: Platform | Market) => {
    if (isPlatform) {
      const platform = item as Platform;
      setPlatformDraft({
        id: platform.id,
        nome: platform.nome,
        cobraTaxa: platform.cobraTaxa,
        taxa: platform.taxa ? String(platform.taxa) : "",
        isApp: platform.isApp || false,
        comissaoMensal: platform.comissaoMensal ? String(platform.comissaoMensal) : "",
      });
    } else {
      const market = item as Market;
      setMarketDraft({ id: market.id, nome: market.nome });
    }
    setIsOpen(true);
  };

  const persistItems = (nextItems: Platform[] | Market[]) => {
    setItems(nextItems);
    if (isPlatform) {
      savePlatforms(nextItems as Platform[]);
    } else {
      saveMarkets(nextItems as Market[]);
    }
  };

  const handleDelete = (id: string) => {
    persistItems(items.filter((item) => item.id !== id));
    toast({
      title: isPlatform ? "Plataforma removida" : "Mercado removido",
      description: "O cadastro foi excluído com sucesso.",
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isPlatform) {
      const nome = platformDraft.nome.trim();
      const taxa = platformDraft.cobraTaxa ? parseCurrencyInput(platformDraft.taxa) : 0;
      const comissao = platformDraft.isApp ? parseCurrencyInput(platformDraft.comissaoMensal || "0") : 0;

      if (!nome) {
        toast({ title: "Nome obrigatório", description: "Informe o nome da plataforma.", variant: "destructive" });
        return;
      }

      if (platformDraft.isApp && (Number.isNaN(comissao) || comissao < 0)) {
        toast({ title: "Comissão inválida", description: "Informe a comissão da plataforma.", variant: "destructive" });
        return;
      }

      if (platformDraft.cobraTaxa && (Number.isNaN(taxa) || taxa < 0)) {
        toast({ title: "Taxa inválida", description: "Informe a taxa da plataforma.", variant: "destructive" });
        return;
      }

      const nextPlatform: Platform = {
        id: platformDraft.id ?? createId(),
        nome,
        cobraTaxa: platformDraft.cobraTaxa && !platformDraft.isApp,
        taxa: platformDraft.cobraTaxa && !platformDraft.isApp ? taxa : 0,
        isApp: platformDraft.isApp || false,
        comissaoMensal: platformDraft.isApp ? comissao : undefined,
      };

      const nextItems = platformDraft.id
        ? (items as Platform[]).map((item) => (item.id === nextPlatform.id ? nextPlatform : item))
        : [...(items as Platform[]), nextPlatform];

      persistItems(nextItems);
      toast({
        title: platformDraft.id ? "Plataforma atualizada" : "Plataforma criada",
        description: `${nome} foi salva com sucesso.`,
      });
    } else {
      const nome = marketDraft.nome.trim();

      if (!nome) {
        toast({ title: "Nome obrigatório", description: "Informe o nome do mercado.", variant: "destructive" });
        return;
      }

      const nextMarket: Market = {
        id: marketDraft.id ?? createId(),
        nome,
      };

      const nextItems = marketDraft.id
        ? (items as Market[]).map((item) => (item.id === nextMarket.id ? nextMarket : item))
        : [...(items as Market[]), nextMarket];

      persistItems(nextItems);
      toast({
        title: marketDraft.id ? "Mercado atualizado" : "Mercado criado",
        description: `${nome} foi salvo com sucesso.`,
      });
    }

    setIsOpen(false);
    resetDraft();
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{isPlatform ? "Plataformas" : "Mercados"}</CardTitle>
          <CardDescription>
            {isPlatform
              ? "Cadastre canais de venda e configure a comissão de cada um."
              : "Cadastre fornecedores e locais de compra para usar nas entradas de estoque."}
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isPlatform ? "Nova Plataforma" : "Novo Mercado"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isPlatform ? "Cadastro de Plataforma" : "Cadastro de Mercado"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">{isPlatform ? "Nome da Plataforma" : "Nome do Mercado"}</Label>
                <Input
                  id="category-name"
                  value={isPlatform ? platformDraft.nome : marketDraft.nome}
                  onChange={(event) =>
                    isPlatform
                      ? setPlatformDraft((current) => ({ ...current, nome: event.target.value }))
                      : setMarketDraft((current) => ({ ...current, nome: event.target.value }))
                  }
                  placeholder={isPlatform ? "Ex: Delivery Much" : "Ex: Atacadão"}
                />
              </div>

              {isPlatform && (
                <>
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <p className="font-medium">É um aplicativo de delivery?</p>
                      <p className="text-sm text-muted-foreground">iFood, Delivery Much, etc.</p>
                    </div>
                    <Switch
                      checked={platformDraft.isApp || false}
                      onCheckedChange={(checked) =>
                        setPlatformDraft((current) => ({
                          ...current,
                          isApp: checked,
                          cobraTaxa: !checked ? current.cobraTaxa : false,
                          comissaoMensal: checked ? current.comissaoMensal : "",
                          taxa: checked ? "" : current.taxa,
                        }))
                      }
                    />
                  </div>

                  {platformDraft.isApp ? (
                    <div className="space-y-2">
                      <Label htmlFor="app-commission">Comissão Mensal (%)</Label>
                      <Input
                        id="app-commission"
                        value={platformDraft.comissaoMensal || ""}
                        onChange={(event) =>
                          setPlatformDraft((current) => ({ ...current, comissaoMensal: event.target.value }))
                        }
                        placeholder="Ex: 12"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                          <p className="font-medium">Cobra taxa por venda?</p>
                          <p className="text-sm text-muted-foreground">Ative para descontar na venda.</p>
                        </div>
                        <Switch
                          checked={platformDraft.cobraTaxa}
                          onCheckedChange={(checked) =>
                            setPlatformDraft((current) => ({
                              ...current,
                              cobraTaxa: checked,
                              taxa: checked ? current.taxa : "",
                            }))
                          }
                        />
                      </div>

                      {platformDraft.cobraTaxa && (
                        <div className="space-y-2">
                          <Label htmlFor="platform-fee">Taxa (%)</Label>
                          <Input
                            id="platform-fee"
                            value={platformDraft.taxa}
                            onChange={(event) =>
                              setPlatformDraft((current) => ({ ...current, taxa: event.target.value }))
                            }
                            placeholder="Ex: 12,5"
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedItems.length ? (
          sortedItems.map((item) => (
            <div key={item.id} className="rounded-2xl border bg-card/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <p className="font-semibold">{item.nome}</p>
                  </div>
                  {isPlatform && (
                    <p className="text-sm text-muted-foreground">
                      {(item as Platform).isApp
                        ? `Comissão: ${(item as Platform).comissaoMensal}%`
                        : (item as Platform).cobraTaxa ? `Taxa: ${(item as Platform).taxa}%` : "Sem taxa configurada"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {isPlatform
              ? "Nenhuma plataforma cadastrada ainda."
              : "Nenhum mercado cadastrado ainda."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
