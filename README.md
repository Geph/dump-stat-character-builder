# Dump Stat

A modern D&D 5.5e character builder and compendium built with Next.js and Supabase.

## Features

### Character Builder
- **Step-by-step character creation** - Guided workflow through species, class, ability scores, background, and equipment selection
- **Multi-class support** - Build characters with multiple classes and track levels independently
- **Real-time preview** - See your character sheet update live as you make choices
- **Point buy & standard array** - Multiple methods for determining ability scores
- **Automatic calculations** - HP, AC, saving throws, skills, and modifiers calculated automatically

### Compendium
- **SRD Content** - Pre-loaded with D&D 5.5e Systems Reference Document content
- **Custom Content Creation** - Create and manage your own:
  - Species with custom traits and ability score bonuses
  - Classes with hit dice, saving throws, and proficiencies
  - Subclasses linked to parent classes
  - Backgrounds with skill proficiencies and equipment
  - Feats with prerequisites and benefits
  - Spells with full casting details
  - Equipment including weapons, armor, and adventuring gear
  - Custom abilities for homebrew features
- **Filtering & Search** - Find content quickly with search and category filters

### Character Management
- **Save & Load Characters** - Persist characters to the database
- **Export Options** - Download character data as JSON
- **Character Sheet View** - Full character sheet with all details

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React + Game Icons
- **Animations**: Framer Motion

## Requirements

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account (for database)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Geph/v0-dump-stat-character-builder.git
cd v0-dump-stat-character-builder
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Project Settings > API
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Initialize the database

Run the seed endpoint to create tables and populate with SRD content:

```bash
# Start the dev server first
pnpm dev

# Then visit in your browser or curl:
http://localhost:3000/api/seed
```

This will create the following tables:
- `species` - Playable species/races
- `classes` - Character classes
- `subclasses` - Class subclasses
- `backgrounds` - Character backgrounds
- `feats` - Feats and features
- `spells` - Spell compendium
- `equipment` - Weapons, armor, and gear
- `custom_abilities` - User-created abilities
- `characters` - Saved characters

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/
├── page.tsx              # Landing page
├── builder/              # Character builder
├── characters/           # Character list and sheets
├── compendium/           # Content browser and editors
│   ├── species/
│   ├── classes/
│   ├── subclasses/
│   ├── backgrounds/
│   ├── feats/
│   ├── spells/
│   ├── equipment/
│   └── abilities/
├── import/               # JSON import functionality
└── api/
    └── seed/             # Database seeding endpoint

components/
├── main-nav.tsx          # Navigation header
├── game-icon-picker.tsx  # Icon selection for custom content
└── ui/                   # shadcn/ui components

lib/
├── supabase.ts           # Supabase client
├── types.ts              # TypeScript interfaces
└── utils.ts              # Utility functions
```

## Customization

### Adding Custom Content

Use the Compendium section to create custom:
- Species with unique traits
- Classes and subclasses
- Backgrounds
- Feats
- Spells
- Equipment
- Custom abilities

All custom content is marked with "Custom" source and can be toggled to appear in the character builder.

### Theming

The app uses CSS custom properties for theming. Edit `app/globals.css` to customize colors:

```css
:root {
  --primary: /* your primary color */;
  --secondary: /* your secondary color */;
  --accent: /* your accent color */;
  /* ... */
}
```

## License

This project uses content from the D&D 5.5e Systems Reference Document (SRD) under the Creative Commons license.

## Links

- [Continue developing on v0](https://v0.app/chat/projects/prj_Z07M3vx9HphfTfMDkIp9oqtpaHYN)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
