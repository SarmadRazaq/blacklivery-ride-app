import os
import glob
import re

files = glob.glob('lib/features/earnings/*.dart')

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'context.read' not in content and 'context.watch' not in content and 'Consumer<' not in content:
        continue
        
    print(f'Processing {file}')
    
    # Add imports
    if 'flutter_riverpod.dart' not in content:
        content = content.replace("import 'package:flutter/material.dart';", "import 'package:flutter/material.dart';\nimport 'package:flutter_riverpod/flutter_riverpod.dart';\nimport '../../core/providers/riverpod_providers.dart';")
    
    # Replace StatefulWidget
    content = re.sub(r'class (\w+) extends StatefulWidget', r'class \1 extends ConsumerStatefulWidget', content)
    content = re.sub(r'State<(\w+)> createState\(\) =>', r'ConsumerState<\1> createState() =>', content)
    content = re.sub(r'class (\w+) extends State<(\w+)>', r'class \1 extends ConsumerState<\2>', content)
    
    # Replace StatelessWidget
    content = re.sub(r'class (\w+) extends StatelessWidget', r'class \1 extends ConsumerWidget', content)
    content = re.sub(r'Widget build\(BuildContext context\)', r'Widget build(BuildContext context, WidgetRef ref)', content)
    
    # Replace context.read/watch
    content = content.replace('context.read<EarningsProvider>()', 'ref.read(earningsRiverpodProvider)')
    content = content.replace('context.watch<EarningsProvider>()', 'ref.watch(earningsRiverpodProvider)')
    content = content.replace('context.read<RegionProvider>()', 'ref.read(regionRiverpodProvider)')
    content = content.replace('context.watch<RegionProvider>()', 'ref.watch(regionRiverpodProvider)')
    
    # Replace Consumer
    content = re.sub(r'Consumer<EarningsProvider>\(\s*builder: \(context, (\w+), child\) {', r'Consumer(\n  builder: (context, ref, child) {\n    final \1 = ref.watch(earningsRiverpodProvider);', content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
