#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive fix for import_infrastructure_v2.sql
Restore all corrupted Vietnamese text to proper UTF-8
"""
import sys

file_path = r'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'

# Read file with UTF-8 encoding (errors='replace' to handle any malformed bytes)
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Dictionary of corrupted text to proper Vietnamese
fixes = {
    # Check 1: Rỗng LotCode
    'Rá»—ng LotCode': 'Rỗng LotCode',
    "N'Thiáº¿u mÃ£ Lot (Lot ID)'": "N'Thiếu mã Lot (Lot ID)'",
    
    # Check 2: LotCode exists in DB
    "N'Lot ID exists in InventoryLots'": "N'Mã Lot ID đã tồn tại trong kho'",
    
    # Check 3: Material not found
    "N'Vật liệu không tồn tại: '": "N'Vật liệu \"'",
    
    # Check 4: Invalid project/build
    "N'Dự án/Build không hợp lệ': '": "N'Dự án/Build ('",
    
    # Phương án 2 comments
    'PhÆ°Æ¡ng Ã¡n 2': 'Phương án 2',
    'GÃ¡n IsValid': 'Gán IsValid',
    'Táº¤T Cáº¢ cÃ¡c dÃ²ng há»£p lá»‡': 'TẤT CẢ các dòng hợp lệ',
    'KhÃ´ng Ä‘Ã¡nh lá»—i trÃ¹ng láº·p': 'Không đánh lỗi trùng lặp',
    'sáº½ dÃ¹ng FinalLotCode vá»›i háº­u tá»‘': 'sẽ dùng FinalLotCode với hậu tố',
    'dÃ¹ng FinalLotCode vá»›i háº­u tá»‘': 'dùng FinalLotCode với hậu tố',
}

print("=== BEFORE FIX ===")
for line_num, line in enumerate(content.split('\n'), 1):
    if any(corrupted in line for corrupted in fixes.keys()):
        print(f"Line {line_num}: {line[:100]}")

print("\n=== APPLYING FIXES ===")
for corrupted, proper in fixes.items():
    if corrupted in content:
        content = content.replace(corrupted, proper)
        print(f"Fixed: {corrupted[:50]}... -> {proper[:50]}...")

print("\n=== AFTER FIX ===")
for line_num, line in enumerate(content.split('\n'), 1):
    if any(proper in line for proper in fixes.values()):
        print(f"Line {line_num}: {line[:100]}")

# Write back with UTF-8 BOM to ensure proper encoding
with open(file_path, 'w', encoding='utf-8-sig', newline='\r\n') as f:
    f.write(content)

print("\n=== File saved with UTF-8 BOM ===")
