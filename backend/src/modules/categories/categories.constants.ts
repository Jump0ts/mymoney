export const DEFAULT_CATEGORIES = [
  { name: "Nómina", icon: "briefcase", color: "#2ECC71", type: "INCOME" },
  { name: "Otros ingresos", icon: "plus-circle", color: "#27AE60", type: "INCOME" },
  { name: "Alimentación", icon: "shopping-cart", color: "#E67E22", type: "EXPENSE" },
  { name: "Vivienda", icon: "home", color: "#8E44AD", type: "EXPENSE" },
  { name: "Transporte", icon: "car", color: "#2980B9", type: "EXPENSE" },
  { name: "Ocio", icon: "smile", color: "#F1C40F", type: "EXPENSE" },
  { name: "Salud", icon: "heart", color: "#E74C3C", type: "EXPENSE" },
  { name: "Compras", icon: "shopping-bag", color: "#EA738D", type: "EXPENSE" },
  { name: "Suscripciones", icon: "repeat", color: "#1ABC9C", type: "EXPENSE" },
  { name: "Otros gastos", icon: "more-horizontal", color: "#7F8C8D", type: "EXPENSE" },
] as const;
