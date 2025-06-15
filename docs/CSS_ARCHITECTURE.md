# 🎨 CSS Architecture

Unique styling techniques and advanced patterns used in BookSwipe.

## 📁 File Organization

### `main.css` - Core Styles

Dynamic screen transitions, CSS custom properties, responsive breakpoints

### `cards.css` - Swipe Physics

3D transforms, stacking contexts, gesture-responsive animations

### `animations.css` - Motion Design

Complex keyframes, performance-optimized transitions, hardware acceleration

## 🔧 Advanced CSS Techniques

### Multi-Layer Card Stacking

```css
.book-card:nth-child(1) {
  z-index: 10;
  transform: scale(1) translateY(0);
}
.book-card:nth-child(2) {
  z-index: 9;
  transform: scale(0.95) translateY(10px);
}
.book-card:nth-child(3) {
  z-index: 8;
  transform: scale(0.9) translateY(20px);
}
```

Creates a visual depth illusion with automatic stacking order.

### Real-time Transform Updates

```css
.book-card {
  transform-origin: center bottom;
  will-change: transform;
  transition: none; /* Disabled during drag */
}

.book-card.dragging {
  transition: none;
  transform: translateX(var(--drag-x)) translateY(var(--drag-y))
    rotate(var(--drag-rotation));
}
```

JavaScript updates CSS custom properties for smooth 60fps gestures.

### Dynamic Easing Functions

```css
.card-exit-left {
  transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  transform: translateX(-100vw) rotate(-30deg);
}

.card-exit-right {
  transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  transform: translateX(100vw) rotate(30deg);
}
```

Custom bezier curves that mimic real card physics.

## 🎯 Performance Optimizations

### GPU Acceleration Strategy

```css
.book-card {
  transform: translateZ(0); /* Force layer creation */
  backface-visibility: hidden; /* Optimize 3D transforms */
  perspective: 1000px; /* Enable 3D context */
}
```

### Touch-Action Optimization

```css
.card-stack {
  touch-action: pan-y pinch-zoom; /* Allow vertical scroll, prevent horizontal */
}

.book-card {
  touch-action: none; /* Disable all browser gestures */
}
```

Prevents browser interference with custom gesture handling.

### CSS-in-JS Integration Points

```css
.book-card {
  /* Styles that JavaScript modifies */
  --drag-x: 0;
  --drag-y: 0;
  --drag-rotation: 0;

  transform: translateX(calc(var(--drag-x) * 1px))
    translateY(calc(var(--drag-y) * 1px))
    rotate(calc(var(--drag-rotation) * 1deg));
}
```

CSS custom properties as the interface between JS and CSS.
