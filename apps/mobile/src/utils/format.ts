const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export const formatMoney = (amount: number | string): string => {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return currencyFormatter.format(value);
};

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const formatDate = (isoDate: string): string => dateFormatter.format(new Date(isoDate));

const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'short' });

export const formatMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const label = monthFormatter.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const monthYearFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

export const formatMonthYearLabel = (year: number, month: number): string => {
  const label = monthYearFormatter.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
};
