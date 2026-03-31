"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeManager } from "./recipe-manager";
import { Cake, Droplet } from "lucide-react";

export function RecipeFlow() {
  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="dough" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-primary/10 to-primary/5 p-1">
          <TabsTrigger value="dough" className="flex items-center gap-2">
            <Cake className="h-4 w-4" />
            Massa
          </TabsTrigger>
          <TabsTrigger value="filling" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />
            Recheio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dough" className="mt-6">
          <RecipeManager
            recipeType="dough"
            title="Receitas de Massa"
            description="Crie e gerencie suas receitas de massa. Adicione ingredientes, defina o rendimento e acompanhe os custos."
            collectionName="receitas_massa"
          />
        </TabsContent>

        <TabsContent value="filling" className="mt-6">
          <RecipeManager
            recipeType="filling"
            title="Receitas de Recheio"
            description="Crie e gerencie suas receitas de recheio. Combine ingredientes e calcule o custo por unidade."
            collectionName="receitas_recheio"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
