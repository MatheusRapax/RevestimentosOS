import pandas as pd
import os

directory = "/home/matheus/Área de trabalho/ERP-Geral/revestimentos/planilhas"
files = [
    "BOUTIQUE BRASIL 2025 - VAREJO PIERINI.xlsx",
    "Tabela Preços Castelli - Tab01 - +70m2.xlsx",
    "Tabela Preço Embramaco Porcelanato - Tab01_Nova Politica_Jan2025.xls"
]

for filename in files:
    path = os.path.join(directory, filename)
    print(f"\n--- Analyzing: {filename} ---")
    try:
        # Try finding header row automatically or default to 0
        # Often these sheets have metadata in top rows. I'll read first 10 rows and print them to visually identify header.
        df_preview = pd.read_excel(path, header=None, nrows=10)
        print("First 10 rows preview:")
        print(df_preview.to_string())
    except Exception as e:
        print(f"Error reading {filename}: {e}")
