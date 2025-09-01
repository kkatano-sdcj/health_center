#!/usr/bin/env python3
"""
メタデータファイルを更新し、originalとconvertedディレクトリのファイル整合性を確認
"""

import json
import os
from pathlib import Path
from datetime import datetime

def update_metadata():
    # ディレクトリパス
    original_dir = Path("original")
    converted_dir = Path("converted")
    metadata_dir = Path("metadata")
    metadata_file = metadata_dir / "file_metadata.json"
    
    # メタデータディレクトリが存在しない場合は作成
    metadata_dir.mkdir(exist_ok=True)
    
    # 既存のメタデータを読み込む（存在する場合）
    metadata = {}
    if metadata_file.exists():
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    
    # originalディレクトリのファイルをチェック
    print("=== Checking original directory files ===")
    original_files = {}
    for file_path in original_dir.iterdir():
        if file_path.is_file() and file_path.name != '.gitignore':
            original_files[file_path.stem] = {
                'name': file_path.name,
                'size': file_path.stat().st_size,
                'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            }
            print(f"Found original: {file_path.name}")
    
    # convertedディレクトリのファイルをチェック
    print("\n=== Checking converted directory files ===")
    converted_files = {}
    for file_path in converted_dir.iterdir():
        if file_path.is_file() and file_path.suffix == '.md' and file_path.name != '.gitignore':
            # タイムスタンプ付きのファイル名から元のファイル名を抽出
            stem = file_path.stem
            # _YYYYMMDD_HHMMSS形式のサフィックスを削除
            import re
            original_stem = re.sub(r'_\d{8}_\d{6}$', '', stem)
            
            converted_files[original_stem] = {
                'converted_name': file_path.name,
                'size': file_path.stat().st_size,
                'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            }
            print(f"Found converted: {file_path.name} (original stem: {original_stem})")
    
    # メタデータを更新
    print("\n=== Updating metadata ===")
    for stem, original_info in original_files.items():
        if stem not in metadata:
            metadata[stem] = {}
        
        # オリジナルファイルの情報を更新
        metadata[stem]['original_filename'] = original_info['name']
        metadata[stem]['original_size'] = original_info['size']
        metadata[stem]['original_modified'] = original_info['modified']
        
        # ファイルタイプを判定
        ext = Path(original_info['name']).suffix.lower()
        if ext in ['.pdf']:
            metadata[stem]['file_type'] = 'pdf'
        elif ext in ['.doc', '.docx']:
            metadata[stem]['file_type'] = 'docx'
        elif ext in ['.xls', '.xlsx']:
            metadata[stem]['file_type'] = 'xlsx'
        elif ext in ['.ppt', '.pptx']:
            metadata[stem]['file_type'] = 'pptx'
        elif ext in ['.txt']:
            metadata[stem]['file_type'] = 'txt'
        elif ext in ['.csv']:
            metadata[stem]['file_type'] = 'csv'
        elif ext in ['.md']:
            metadata[stem]['file_type'] = 'markdown'
        else:
            metadata[stem]['file_type'] = 'unknown'
        
        # 変換済みファイルの情報を更新
        if stem in converted_files:
            metadata[stem]['has_converted'] = True
            metadata[stem]['converted_filename'] = converted_files[stem]['converted_name']
            metadata[stem]['converted_size'] = converted_files[stem]['size']
            metadata[stem]['converted_at'] = converted_files[stem]['modified']
            print(f"Updated: {stem} - Original: {original_info['name']} -> Converted: {converted_files[stem]['converted_name']}")
        else:
            metadata[stem]['has_converted'] = False
            print(f"Updated: {stem} - Original: {original_info['name']} (not converted)")
    
    # convertedディレクトリにあるが、originalディレクトリにないファイルをチェック
    print("\n=== Checking orphaned converted files ===")
    for stem in converted_files:
        if stem not in original_files:
            print(f"Warning: Converted file without original: {converted_files[stem]['converted_name']}")
            # オリジナルファイルが削除されている場合でもメタデータに記録
            if stem not in metadata:
                metadata[stem] = {}
            metadata[stem]['has_converted'] = True
            metadata[stem]['converted_filename'] = converted_files[stem]['converted_name']
            metadata[stem]['converted_size'] = converted_files[stem]['size']
            metadata[stem]['converted_at'] = converted_files[stem]['modified']
            metadata[stem]['original_deleted'] = True
    
    # メタデータをファイルに保存
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== Metadata updated successfully ===")
    print(f"Total metadata entries: {len(metadata)}")
    print(f"Metadata file: {metadata_file}")
    
    # 統計情報を表示
    total_original = len(original_files)
    total_converted = sum(1 for m in metadata.values() if m.get('has_converted', False))
    print(f"\nStatistics:")
    print(f"  Original files: {total_original}")
    print(f"  Converted files: {total_converted}")
    print(f"  Conversion rate: {(total_converted/total_original*100 if total_original > 0 else 0):.1f}%")

if __name__ == "__main__":
    # スクリプトのディレクトリからbackendディレクトリに移動
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    os.chdir(backend_dir)
    
    update_metadata()