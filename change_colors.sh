#!/bin/bash

# 🎨 Skrypt do zamiany kolorów na lawendowo-fioletowe

echo "🎨 Zamiana kolorów na lawendowo-fioletowe..."

# Zmienne kolorów
OLD_PRIMARY="#FF6B35"
OLD_ACCENT="#FF4C2E"
OLD_GRADIENT_1="#FF7A59"
OLD_GRADIENT_2="#FF8E53"
OLD_GRADIENT_3="#F7931E"

NEW_PRIMARY="#8B7AB8"
NEW_ACCENT="#9D8AC7"
NEW_GRADIENT_1="#B8A3E0"
NEW_GRADIENT_2="#9D8AC7"
NEW_GRADIENT_3="#7B68A6"

# Lista plików do zamiany
FILES=(
  "app/(auth)/login.tsx"
  "components/ui/Input.tsx"
  "components/ui/Button.tsx"
)

echo "📝 Pliki do modyfikacji:"
for file in "${FILES[@]}"; do
  echo "  - $file"
done

echo ""
echo "🔄 Rozpoczynam zamianę kolorów..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✏️  Edytuję: $file"
    
    # Zamiana kolorów
    sed -i.bak \
      -e "s/$OLD_PRIMARY/$NEW_PRIMARY/g" \
      -e "s/$OLD_ACCENT/$NEW_ACCENT/g" \
      -e "s/$OLD_GRADIENT_1/$NEW_GRADIENT_1/g" \
      -e "s/$OLD_GRADIENT_2/$NEW_GRADIENT_2/g" \
      -e "s/$OLD_GRADIENT_3/$NEW_GRADIENT_3/g" \
      "$file"
    
    # Usuń backup (opcjonalnie)
    rm -f "$file.bak"
    
    echo "     ✅ Zakończono"
  else
    echo "     ⚠️  Plik nie istnieje: $file"
  fi
done

echo ""
echo "🎉 Zamiana kolorów zakończona!"
echo ""
echo "📋 Podsumowanie zmian:"
echo "  Stary Primary:   $OLD_PRIMARY → Nowy: $NEW_PRIMARY"
echo "  Stary Accent:    $OLD_ACCENT → Nowy: $NEW_ACCENT"
echo "  Gradient 1:      $OLD_GRADIENT_1 → $NEW_GRADIENT_1"
echo "  Gradient 2:      $OLD_GRADIENT_2 → $NEW_GRADIENT_2"
echo "  Gradient 3:      $OLD_GRADIENT_3 → $NEW_GRADIENT_3"
echo ""
echo "🔄 Uruchom ponownie aplikację:"
echo "   npx expo start -c"
