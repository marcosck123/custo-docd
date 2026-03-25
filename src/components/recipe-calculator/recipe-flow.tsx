"use client";

import React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FinalProductManager } from "./final-product-manager";
import { RecipeManager } from "./recipe-manager";
import { SavedProductsManager } from "./saved-products-manager";

export function RecipeFlow() {
  return (
    <Tabs defaultValue="creator" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="creator">Nova Receita</TabsTrigger>
        <TabsTrigger value="saved">Produtos Salvos</TabsTrigger>
      </TabsList>

      <TabsContent value="creator">
        <Tabs defaultValue="dough" className="mt-4 w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dough">1. Massa</TabsTrigger>
            <TabsTrigger value="filling">2. Recheio</TabsTrigger>
            <TabsTrigger value="product">3. Produto Final</TabsTrigger>
          </TabsList>

          <TabsContent value="dough" className="mt-4">
            <RecipeManager
              recipeType="dough"
              title="Massa"
              description="Crie e gerencie suas receitas de massa."
              collectionName="receitas_massa"
            />
          </TabsContent>

          <TabsContent value="filling" className="mt-4">
            <RecipeManager
              recipeType="filling"
              title="Recheio"
              description="Crie e gerencie suas receitas de recheio."
              collectionName="receitas_recheio"
            />
          </TabsContent>

          <TabsContent value="product" className="mt-4">
            <FinalProductManager />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="saved" className="mt-4">
        <SavedProductsManager />
      </TabsContent>
    </Tabs>
  );
}
