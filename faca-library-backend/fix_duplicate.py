#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remove duplicate lines 164-165 in import_infrastructure_v2.sql
These are duplicates of lines 162-163
"""
import sys

file_path = r'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'

# Read file with UTF-8 encoding
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# Print lines around the duplication
print(f"Line 162 (0-idx 161): {lines[161].rstrip()}")
print(f"Line 163 (0-idx 162): {lines[162].rstrip()}")
print(f"Line 164 (0-idx 163): {lines[163].rstrip()}")
print(f"Line 165 (0-idx 164): {lines[164].rstrip()}")

# Remove duplicate lines 164-165 (0-indexed: 163-164)
# Keep lines 162-163, remove 164-165, shift everything else up
# Lines to remove: indices 163-164

# Remove the duplicate lines
del lines[163:165]

# Write back with UTF-8 encoding
with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.writelines(lines)

print('Duplicates removed')

# Verify
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    all_lines = f.readlines()
    
print(f'Total lines after fix: {len(all_lines)}')
print(f'Line 162: {all_lines[161].rstrip()}')
print(f'Line 163: {all_lines[162].rstrip()}')
print(f'Line 164: {all_lines[163].rstrip()}')
print(f'Line 165: {all_lines[164].rstrip()}')
