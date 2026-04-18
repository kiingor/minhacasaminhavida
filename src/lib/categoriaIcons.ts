import {
  Home, Lightbulb, Droplet, Wifi, Flame,
  UtensilsCrossed, ShoppingCart, Coffee, Beer,
  Car, Bus, Bike, Fuel, ParkingCircle,
  HeartPulse, Pill, Stethoscope, Dumbbell,
  GraduationCap, BookOpen, Briefcase, Laptop,
  Gamepad2, Film, Music, Plane,
  CreditCard, PiggyBank, Gift, TrendingUp, Package,
  type LucideIcon,
} from "lucide-react";

export type GrupoIcone = "moradia" | "alimentacao" | "transporte" | "saude" | "educacao" | "lazer" | "outros";

export const CATEGORIA_ICONS: Array<{ nome: string; Icon: LucideIcon; grupo: GrupoIcone }> = [
  { nome: "Home", Icon: Home, grupo: "moradia" },
  { nome: "Lightbulb", Icon: Lightbulb, grupo: "moradia" },
  { nome: "Droplet", Icon: Droplet, grupo: "moradia" },
  { nome: "Wifi", Icon: Wifi, grupo: "moradia" },
  { nome: "Flame", Icon: Flame, grupo: "moradia" },
  { nome: "UtensilsCrossed", Icon: UtensilsCrossed, grupo: "alimentacao" },
  { nome: "ShoppingCart", Icon: ShoppingCart, grupo: "alimentacao" },
  { nome: "Coffee", Icon: Coffee, grupo: "alimentacao" },
  { nome: "Beer", Icon: Beer, grupo: "alimentacao" },
  { nome: "Car", Icon: Car, grupo: "transporte" },
  { nome: "Bus", Icon: Bus, grupo: "transporte" },
  { nome: "Bike", Icon: Bike, grupo: "transporte" },
  { nome: "Fuel", Icon: Fuel, grupo: "transporte" },
  { nome: "ParkingCircle", Icon: ParkingCircle, grupo: "transporte" },
  { nome: "HeartPulse", Icon: HeartPulse, grupo: "saude" },
  { nome: "Pill", Icon: Pill, grupo: "saude" },
  { nome: "Stethoscope", Icon: Stethoscope, grupo: "saude" },
  { nome: "Dumbbell", Icon: Dumbbell, grupo: "saude" },
  { nome: "GraduationCap", Icon: GraduationCap, grupo: "educacao" },
  { nome: "BookOpen", Icon: BookOpen, grupo: "educacao" },
  { nome: "Briefcase", Icon: Briefcase, grupo: "educacao" },
  { nome: "Laptop", Icon: Laptop, grupo: "educacao" },
  { nome: "Gamepad2", Icon: Gamepad2, grupo: "lazer" },
  { nome: "Film", Icon: Film, grupo: "lazer" },
  { nome: "Music", Icon: Music, grupo: "lazer" },
  { nome: "Plane", Icon: Plane, grupo: "lazer" },
  { nome: "CreditCard", Icon: CreditCard, grupo: "outros" },
  { nome: "PiggyBank", Icon: PiggyBank, grupo: "outros" },
  { nome: "Gift", Icon: Gift, grupo: "outros" },
  { nome: "TrendingUp", Icon: TrendingUp, grupo: "outros" },
];

const MAPA = new Map(CATEGORIA_ICONS.map((i) => [i.nome, i.Icon]));

export function iconeDaCategoria(nome?: string): LucideIcon {
  if (!nome) return Package;
  return MAPA.get(nome) ?? Package;
}
