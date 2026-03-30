"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StockItem } from "@/lib/types";

interface SimilarProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  similarProducts: StockItem[];
  onSelectProduct: (productId: string) => void;
  onCreateNew: () => void;
}

export function SimilarProductModal({
  open,
  onOpenChange,
  similarProducts,
  onSelectProduct,
  onCreateNew,
}: SimilarProductModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encontramos produtos similares no banco de dados</DialogTitle>
          <DialogDescription>O produto que você quer adicionar é um desses abaixo?</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {similarProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
              <div className="flex-1">
                <p className="font-medium">{product.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {product.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {product.peso} {product.unidade}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onSelectProduct(product.id);
                  onOpenChange(false);
                }}
              >
                Sim, é esse — atualizar
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onCreateNew();
              onOpenChange(false);
            }}
          >
            Não, criar como novo produto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
