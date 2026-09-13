#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix corrupted Vietnamese text in import_infrastructure_v2.sql
Lines 164-170 (0-indexed: 163-169) had encoding issues
"""
import sys

file_path = r'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'

# Read file with UTF-8 encoding (errors='replace' to handle any malformed bytes)
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# Print the problematic lines for debugging
print(f"Line 164 (0-idx 163): {repr(lines[163])}")
print(f"Line 170 (0-idx 169): {repr(lines[169])}")

# Fix lines 164-170 (0-indexed: 163-169)
# Replace corrupted content with clean Vietnamese
new_lines = []

for i, line in enumerate(lines):
    if i == 163:  # Line 164
        new_lines.append('        -- Phương án 2: Gán IsValid = 1 cho TẤT CẢ các dòng hợp lệ\n')
    elif i == 164:  # Line 165
        new_lines.append('        -- Không đánh lỗi trùng lặp, sẽ dùng FinalLotCode với hậu tố -1, -2, -3...\n')
    elif i == 165:  # Line 166
        new_lines.append('        UPDATE s SET s.IsValid = 1\n')
    elif i == 166:  # Line 167
        new_lines.append('        FROM dbo.Staging_InventoryImport s\n')
    elif i == 167:  # Line 168
        new_lines.append('        WHERE s.ImportID = @ImportID AND s.ErrorMessage IS NULL;\n')
    elif i == 168:  # Line 169
        new_lines.append('\n')
    elif i == 169:  # Line 170 - had concatenation issue
        new_lines.append('        -- Phương án 2: Không đánh lỗi trùng lặp, dùng FinalLotCode với hậu tố -1, -2, -3...\n')
        new_lines.append('\n')
        new_lines.append('        -- C. INSERT INTO INVENTORYLOTS\n')
    elif i == 170:  # Line 171 - skip, already handled in 169
        continue
    else:
        new_lines.append(line)

# Write back with UTF-8 encoding
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.writelines(new_lines)

print('File fixed successfully')

# Verify
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    all_lines = f.readlines()
    
print(f'Verify line 164: {all_lines[163].rstrip()}')
print(f'Verify line 170: {all_lines[169].rstrip()}')
print(f'Total lines: {len(all_lines)}')
