#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simplify the NOT EXISTS check in export_infrastructure_v2.sql
The current implementation recalculates ROW_NUMBER() in the NOT EXISTS subquery,
which is incorrect. We should check if FinalLotCode already exists.
"""
import sys

file_path = r'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'

# Read file with UTF-8 encoding
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# The problematic section is the NOT EXISTS check that recalculates ROW_NUMBER()
# We should remove it since the CTE already generates unique FinalLotCode

# Define the old problematic block
old_block = """            WHERE s.ImportID = @ImportID 
              AND s.IsValid = 1
              -- Bảo vệ: Không chèn LotCode đã tồn tại trong kho (bao gồm cả các mã đã thêm hậu tố)
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.InventoryLots il 
                  WHERE LTRIM(RTRIM(il.LotCode)) = 
                        CASE 
                            WHEN ROW_NUMBER() OVER (
                                PARTITION BY LTRIM(RTRIM(s.LotCode)) 
                                ORDER BY s.StagingID ASC
                            ) = 1 
                            THEN LTRIM(RTRIM(s.LotCode))
                            ELSE LTRIM(RTRIM(s.LotCode)) + '-' + CAST(
                                ROW_NUMBER() OVER (
                                    PARTITION BY LTRIM(RTRIM(s.LotCode)) 
                                    ORDER BY s.StagingID ASC
                                ) AS VARCHAR(10)
                            )
                        END
              )"""

# Define the simplified version - just check IsValid and ImportID
# The CTE already ensures unique FinalLotCode with suffixes
new_block = """            WHERE s.ImportID = @ImportID 
              AND s.IsValid = 1"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print('Replaced problematic NOT EXISTS block')
else:
    print('Old block not found - file may already be clean')

# Write back
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print('File simplified')

# Verify
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
    
print(f'Total lines: {len(lines)}')
for i, line in enumerate(lines[205:215], start=206):
    print(f'Line {i}: {line.rstrip()}')
