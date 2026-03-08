# **App Name**: Custo Doce

## Core Features:

- Gerenciamento de Ingredientes: Adicionar ou remover até 10 linhas de ingredientes, com campos para Nome, Preço Total do Pacote, Quantidade Total do Pacote e Quantidade Usada na Receita.
- Cálculo do Custo por Ingrediente: Calcula automaticamente o custo individual de cada ingrediente usado na receita com base nos dados fornecidos.
- Custo Total da Receita: Soma o custo de todos os ingredientes para exibir o custo total da receita.
- Detalhes da Receita: Campos para o nome da receita e, opcionalmente, a quantidade de unidades produzidas para cálculo posterior.
- Cálculo do Custo por Unidade: Calcula e exibe automaticamente o custo por unidade do produto final, se a quantidade de unidades for informada.
- Persistência de Receitas no Firestore: Permite salvar e carregar as receitas completas, incluindo ingredientes e cálculos, usando o Firebase Firestore como banco de dados.
- Atualizações em Tempo Real: As exibições de custo e totais se atualizam instantaneamente conforme o usuário digita ou altera os valores de entrada.

## Style Guidelines:

- A color palette inspired by the precision and fresh elegance of confectionery work. A light theme for readability and a clean interface. Primary color (for accents, buttons): #247680 (a deep, serene blue-green). Background color (light and subtle): #EBF1F2 (a very light, almost white, with a hint of blue-green). Accent color (for highlights and interactive elements): #42D8A0 (a vibrant, fresh green).
- Body and headline font: 'Inter' (sans-serif) for its modern, neutral, and highly readable qualities, ensuring clarity for numerical data and recipe details.
- Utilize simple, functional line icons for actions like 'Adicionar Ingrediente', 'Remover Ingrediente', e 'Salvar Receita', enhancing user navigation without distraction.
- A clean, responsive tabular layout for ingredient entry and cost display, optimized for various screen sizes, ensuring easy data input and result visualization. Clearly demarcated sections for recipe inputs, ingredient lists, and calculated totals.
- Subtle, smooth animations for adding or removing ingredient rows. A gentle pulse or highlight effect on calculated total values when they update dynamically to draw attention to changes.