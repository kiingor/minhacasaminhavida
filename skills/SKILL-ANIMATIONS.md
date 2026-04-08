# SKILL: Animations (Framer Motion)

## Princípio
Todas as animações via **Framer Motion**. CSS animations só para loaders simples.

## Padrões reutilizáveis

### Entrada de página
```tsx
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
```
Cards filhos com `staggerChildren: 0.05`.

### Hover de card
```tsx
whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
```

### Check de tarefa
```tsx
whileTap={{ scale: 0.9 }}
// ícone interno: initial scale 0 rotate -180 → animate scale 1 rotate 0
```
Disparar partículas com `canvas-confetti` (mini burst, 30 partículas).

### XP flutuante
```tsx
<motion.span
  initial={{ y: 0, opacity: 1, scale: 0.8 }}
  animate={{ y: -60, opacity: 0, scale: 1.2 }}
  transition={{ duration: 1.2, ease: "easeOut" }}
>+40 XP</motion.span>
```

### Progress bar XP
```tsx
<motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
```

### Level Up Modal
- Background fade escuro 200ms
- Foto: spring bounce + borda dourada pulsante (`animate={{ boxShadow: ["0 0 20px gold", "0 0 60px gold", "0 0 20px gold"] }}` loop)
- Texto "LEVEL UP!" com scale spring e glow
- Transição numérica do nível (count-up via `useMotionValue`)
- `canvas-confetti` 200 partículas douradas
- Fechar após 4s ou clique

## Som
Usar hook `useSound` que respeita preferência do usuário (localStorage `sound-enabled`).
