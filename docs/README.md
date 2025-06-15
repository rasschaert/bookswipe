# 📚 BookSwipe - Documentation

BookSwipe is a "Tinder for Books" voting application for book clubs. This folder contains the web application along with comprehensive documentation to help you understand how it works.

## 🚀 Quick Start

1. **Run the app**: Open `index.html` in your browser or serve it locally
2. **Understand the code**: All files include detailed comments explaining how things work
3. **Make changes**: The code is well-structured and documented for easy modification

## 📖 Documentation

| Document                                       | Purpose                                | When to Read                           |
| ---------------------------------------------- | -------------------------------------- | -------------------------------------- |
| **[LEARNING_GUIDE.md](LEARNING_GUIDE.md)**     | Implementation details and patterns    | Want to understand the architecture    |
| **[CODE_STRUCTURE.md](CODE_STRUCTURE.md)**     | Technical architecture overview        | Planning modifications or integrations |
| **[CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md)** | Styling patterns and responsive design | Working with the visual design         |
| **[EXERCISES.md](EXERCISES.md)**               | Code examples and extensions           | Want to extend functionality           |

## 🛠️ What's Special About This Code

### Well-Commented Codebase

- **JavaScript files** have detailed comments explaining complex logic
- **CSS files** document modern patterns and responsive techniques
- **HTML structure** is clearly organized and semantic

### Modern Web Development Patterns

- Vanilla JavaScript with ES6+ features
- Responsive CSS with custom properties
- Touch-friendly mobile interactions
- RESTful API integration

### Clean Architecture

- Component-based design with clear separation of concerns
- Event-driven communication between modules
- Performance optimizations for smooth interactions

## 📱 Application Features

- **Touch & Mouse Support**: Smooth swiping on mobile, clicking on desktop
- **Responsive Design**: Works on all screen sizes
- **Automatic Dark Theme**: Respects system/browser dark mode preference
- **Real-time Progress**: Visual progress tracking
- **Data Persistence**: Votes saved to PocketBase backend
- **Error Handling**: Graceful degradation and user feedback

## 🔧 Development

### File Structure

```
docs/
├── index.html              # Main application
├── scripts/
│   ├── app.js             # Main application logic
│   ├── swipe-handler.js   # Touch/mouse interactions
│   └── api-fetch.js       # Backend communication
└── styles/
    ├── main.css           # Core styles
    ├── cards.css          # Card-specific styles
    └── animations.css     # Animations and transitions
```

### Making Changes

The code is structured for easy modification:

- **Add features**: Follow existing patterns in `app.js`
- **Modify styling**: CSS custom properties in `main.css`
- **Change interactions**: Touch logic in `swipe-handler.js`
- **API changes**: Backend communication in `api-fetch.js`

### Version Management

Script files use cache-busting parameters in `index.html`:

```html
<script src="scripts/api-fetch.js?v=4"></script>
<script src="scripts/swipe-handler.js?v=4"></script>
<script src="scripts/app.js?v=4"></script>
```

**Important**: Increment the version number (e.g., `?v=5`) when deploying changes to ensure browsers load the updated files.

## 🎯 Understanding the Code

Each file includes detailed comments explaining:

- **Why** decisions were made
- **How** complex algorithms work
- **What** each component does
- **Where** to make common modifications

The documentation provides context without overwhelming the primary purpose: a functional, well-built application.

---

**Note**: This project demonstrates modern web development practices while remaining accessible and well-documented. The code quality and documentation make it suitable for both production use and understanding modern web patterns.
