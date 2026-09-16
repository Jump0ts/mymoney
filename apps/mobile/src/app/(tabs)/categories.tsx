import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryPalette, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { ApiError } from '@/lib/api';
import type { Category, TransactionType } from '@/types/api';

export default function CategoriesScreen() {
  const theme = useTheme();
  const { data: categories } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [isCreating, setIsCreating] = useState(false);

  const expense = categories?.filter((c) => c.type === 'EXPENSE') ?? [];
  const income = categories?.filter((c) => c.type === 'INCOME') ?? [];

  const handleDelete = (category: Category) => {
    Alert.alert('Borrar categoría', `¿Seguro que quieres borrar "${category.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () =>
          deleteCategory.mutate(category.id, {
            onError: (err) =>
              Alert.alert(
                'No se pudo borrar',
                err instanceof ApiError ? err.message : 'Error inesperado',
              ),
          }),
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <ThemedText type="title" style={styles.title}>
              Categorías
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCreating((v) => !v)}
              style={[styles.addButton, { backgroundColor: theme.primary }]}>
              <Feather name={isCreating ? 'x' : 'plus'} size={20} color={theme.primaryText} />
            </Pressable>
          </View>

          {isCreating && <NewCategoryForm onDone={() => setIsCreating(false)} />}

          <CategoryGroup title="Gastos" categories={expense} onDelete={handleDelete} />
          <CategoryGroup title="Ingresos" categories={income} onDelete={handleDelete} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function CategoryGroup({
  title,
  categories,
  onDelete,
}: {
  title: string;
  categories: Category[];
  onDelete: (category: Category) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <View style={styles.group}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {categories.map((category) => (
        <Card key={category.id} style={styles.categoryRow}>
          <View style={[styles.dot, { backgroundColor: category.color }]} />
          <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
          <Pressable onPress={() => onDelete(category)} hitSlop={8}>
            <Feather name="trash-2" size={18} color="#E5484D" />
          </Pressable>
        </Card>
      ))}
    </View>
  );
}

function NewCategoryForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [color, setColor] = useState<string>(CategoryPalette[0]);
  const createCategory = useCreateCategory();

  const submit = () => {
    if (!name.trim()) return;
    createCategory.mutate(
      { name: name.trim(), type, color, icon: 'tag' },
      {
        onSuccess: () => {
          setName('');
          onDone();
        },
        onError: (err) =>
          Alert.alert('No se pudo crear', err instanceof ApiError ? err.message : 'Error inesperado'),
      },
    );
  };

  return (
    <Card style={styles.form}>
      <Input placeholder="Nombre de la categoría" value={name} onChangeText={setName} />

      <View style={styles.segmentRow}>
        {(['EXPENSE', 'INCOME'] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setType(option)}
            style={[styles.segment, { opacity: type === option ? 1 : 0.5 }]}>
            <ThemedText type="small">{option === 'EXPENSE' ? 'Gasto' : 'Ingreso'}</ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.paletteRow}>
        {CategoryPalette.map((swatch) => (
          <Pressable
            key={swatch}
            onPress={() => setColor(swatch)}
            style={[
              styles.swatch,
              { backgroundColor: swatch, borderWidth: color === swatch ? 3 : 0 },
            ]}
          />
        ))}
      </View>

      <Button label="Crear categoría" loading={createCategory.isPending} onPress={submit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, lineHeight: 34 },
  addButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  group: { gap: Spacing.two },
  groupTitle: { marginTop: Spacing.two },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  categoryName: { flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  form: { gap: Spacing.three },
  segmentRow: { flexDirection: 'row', gap: Spacing.three },
  segment: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  swatch: { width: 28, height: 28, borderRadius: 14, borderColor: '#000' },
});
