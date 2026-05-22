# 🌿 María del Mar Blanquería

Sitio web de e-commerce MVP para el emprendimiento de blanquería **María del Mar**, desarrollado con HTML, CSS y JavaScript puro. Sin frameworks, sin dependencias, 100% estático y deployable en cualquier hosting gratuito.

🌐 **Live:** [maria-del-mar-blanqueria.netlify.app](https://maria-del-mar-blanqueria.netlify.app)

---

## ✨ Funcionalidades

- **Catálogo de productos** con carrusel navegable y avance automático
- **Filtro por categorías** (Ropa de cama, Baño, Almohadas, Accesorios)
- **Carrito de compras** con panel lateral deslizable
  - Agregar / quitar unidades por producto
  - Cálculo de total en tiempo real
- **Pedido por WhatsApp** — al finalizar la compra se genera un mensaje automático con el detalle del pedido
- **Logo con fondo transparente** fusionado con el fondo de la página
- **Marca de agua** con el logo repetido sutilmente en el fondo
- **Diseño responsivo** para mobile, tablet y desktop
- **Animaciones** — logo flotante, carrusel con transiciones suaves, header con efecto glassmorphism al hacer scroll

---

## 🗂️ Estructura del proyecto

```
maria-del-mar-blanqueria/
│
├── index.html                  # Estructura HTML principal
│
├── css/
│   └── styles.css              # Todos los estilos (variables, layout, componentes, carrito)
│
├── js/
│   ├── main.js                 # Lógica del carrusel, filtros y productos
│   └── cart.js                 # Lógica del carrito de compras
│
├── assets/
│   ├── logo.png                # Logo original (usado como marca de agua)
│   └── logo-transparent.png    # Logo con fondo removido (hero y header)
│
└── README.md
```

---

## 🚀 Cómo correr el proyecto en local

### Requisitos

- [Git](https://git-scm.com/download/win)
- [VS Code](https://code.visualstudio.com/) con la extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

### Pasos

**1. Clonar el repositorio**

```bash
git clone https://github.com/NicoPavoni/maria-del-mar-blanqueria.git
cd maria-del-mar-blanqueria
```

**2. Abrir en VS Code**

```bash
code .
```

**3. Iniciar Live Server**

- Click derecho en `index.html`
- Seleccioná **"Open with Live Server"**
- El sitio se abre en `http://127.0.0.1:5500`

> ⚠️ No abras `index.html` con doble click directamente — las rutas relativas de imágenes y scripts no funcionan sin un servidor local.

---

## 🌿 Ramas

| Rama   | Descripción                              |
|--------|------------------------------------------|
| `main` | Producción — lo que está publicado en Netlify |
| `dev`  | Desarrollo — acá se trabajan los cambios antes de pasar a producción |

### Flujo de trabajo

```bash
# 1. Moverse a dev antes de tocar cualquier cosa
git checkout dev

# 2. Hacer cambios, probar en local con Live Server

# 3. Guardar y subir los cambios
git add .
git commit -m "descripcion del cambio"
git push origin dev

# 4. Cuando está listo para publicar, mergear a main
git checkout main
git merge dev
git push origin main
```

---

## 🛒 Flujo del carrito (MVP)

1. El cliente navega el catálogo y agrega productos al carrito
2. El panel lateral muestra el resumen con cantidades y total
3. Al hacer click en **"Finalizar pedido por WhatsApp"** se abre un chat con el detalle del pedido armado automáticamente
4. La vendedora confirma stock disponible y coordina el pago por chat

**Ejemplo de mensaje generado:**

```
¡Hola! Quisiera hacer el siguiente pedido:

• Juego de sábanas bordado x2 — $37.000
• Almohada viscoelástica x1 — $9.800

Total estimado: $46.800

¿Tienen stock disponible? ¿Cómo arreglamos el pago? 😊
```

---

## 🗺️ Roadmap

- [x] Catálogo con carrusel y filtros
- [x] Carrito de compras
- [x] Pedido por WhatsApp
- [x] Deploy en Netlify
- [ ] Dominio personalizado `.com.ar`
- [ ] Stock real con base de datos ([Supabase](https://supabase.com))
- [ ] Integración con MercadoPago

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| HTML5      | Estructura |
| CSS3       | Estilos y animaciones |
| JavaScript | Lógica del carrusel, filtros y carrito |
| Google Fonts | Tipografías (Dancing Script, Cormorant Garamond, Lato) |
| Netlify    | Hosting y deploy continuo desde GitHub |

---

## 👤 Autor

**Nico Pavoni**
[github.com/NicoPavoni](https://github.com/NicoPavoni)

---

*Hecho con amor para María del Mar 🌿*
