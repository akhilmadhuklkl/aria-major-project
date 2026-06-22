# Aria App - Frontend Component Architecture

## Overview
The frontend has been refactored from a monolithic `App.tsx` into a well-organized, modular component structure. Each view section now has its own dedicated component with clear responsibilities.

## Project Structure

```
src/
├── App.tsx                 # Main app component (now much simpler)
├── main.tsx               # Entry point
├── types.ts               # Centralized type definitions
├── constants.ts           # All data and constants
├── App.css               # Global styles
│
└── components/
    ├── Layout/            # Application shell
    │   ├── Sidebar.tsx    # Navigation sidebar
    │   ├── Topbar.tsx     # Header with search & notifications
    │   └── index.ts       # Exports
    │
    ├── AgentWorkspace/    # Agent inbox view
    │   ├── AgentWorkspace.tsx      # Main container
    │   ├── ConversationList.tsx    # Left panel - conversation queue
    │   ├── ChatPanel.tsx           # Center panel - active conversation
    │   ├── AIPanel.tsx             # Right panel - AI assistant suggestions
    │   └── index.ts                # Exports
    │
    ├── CustomerChat/      # Customer-facing chat view
    │   ├── CustomerChat.tsx        # Main container
    │   ├── ChatHistory.tsx         # Chat messages & input
    │   ├── FeedbackPrompt.tsx      # Feedback collection UI
    │   └── index.ts                # Exports
    │
    ├── KnowledgeBase/     # Knowledge management view
    │   ├── KnowledgeBase.tsx       # Main container
    │   ├── KnowledgeTable.tsx      # Document list table
    │   ├── KnowledgeSummary.tsx    # Indexing stats
    │   └── index.ts                # Exports
    │
    ├── Analytics/         # Performance analytics view
    │   ├── Analytics.tsx           # Main container
    │   ├── MetricStrip.tsx         # KPI cards (conversations, rating, etc)
    │   ├── ChartsSection.tsx       # Quality trend & topic charts
    │   ├── InsightsSection.tsx     # AI-generated insights
    │   └── index.ts                # Exports
    │
    └── Common/            # Reusable components
        ├── Message.tsx    # Single chat message
        ├── Source.tsx     # Knowledge source reference
        ├── Metric.tsx     # Single KPI card
        └── index.ts       # Exports
```

## Component Hierarchy

### App.tsx
- **Role**: Main component that manages view state
- **Responsibilities**: 
  - Render sidebar and topbar
  - Switch between views (inbox, customer, knowledge, analytics)
  - Manage shared state (conversations, suggestions, etc.)
  - Handle user interactions (regenerate suggestions, send messages)

### Layout Components

#### Sidebar
- **Props**: `view`, `onChange`
- **Purpose**: Navigation and branding
- **Child Sections**: Nav items, help/settings, profile card

#### Topbar
- **Props**: `view`
- **Purpose**: Title, status, search, notifications
- **Reusable**: Search box, icon buttons

### Agent Workspace View

#### AgentWorkspace (Container)
- **Props**: All state for conversation, suggestion, and callbacks
- **Layout**: Three-column grid (ConversationList | ChatPanel | AIPanel)
- **Purpose**: Ties together agent-facing UI

#### ConversationList
- **Props**: `selected`, `onSelect`
- **Purpose**: Queue of open conversations
- **Features**: Unread indicators, priority badges, search filtering

#### ChatPanel
- **Props**: `selected`
- **Purpose**: Active conversation with message history
- **Features**: Chat header, message display, composer

#### AIPanel
- **Props**: `suggestion`, `status`, callbacks
- **Purpose**: AI suggestions and action buttons
- **Features**: Confidence indicator, sources, accept/regenerate/reject buttons

### Customer Chat View

#### CustomerChat (Container)
- **Props**: All state for messages, input, rating, feedback
- **Layout**: Two-column (ChatHistory | Context panel)
- **Purpose**: Simulates direct customer experience

#### ChatHistory
- **Props**: Messages, input state, send callback
- **Purpose**: Message display, feedback prompt, input field
- **Features**: Feedback rating stars, submit button

#### FeedbackPrompt
- **Props**: Rating state, `feedbackSent`, callbacks
- **Purpose**: Collects customer satisfaction feedback
- **Features**: 1-5 star rating, submit button

### Knowledge Base View

#### KnowledgeBase (Container)
- **Props**: `query`, `setQuery`, `items`
- **Layout**: Intro header + toolbar + table + summary
- **Purpose**: Document management interface

#### KnowledgeTable
- **Props**: `items`
- **Purpose**: Searchable table of knowledge documents
- **Columns**: Document, Category, Status, Uses, Updated, Actions

#### KnowledgeSummary
- **Purpose**: Quick stats (indexed sources, retrieval uses, last indexed)

### Analytics View

#### Analytics (Container)
- **Layout**: Intro header + metrics + charts + insights
- **Purpose**: Performance dashboard

#### MetricStrip
- **Purpose**: Four KPI cards (Conversations, Rating, AI acceptance, Correction rate)

#### ChartsSection
- **Purpose**: Two charts (Quality trend area chart, Topics bar chart)

#### InsightsSection
- **Purpose**: Three insight boxes (improvements, warnings, impact)

### Common Components

#### Message
- **Props**: `from` ('customer' | 'agent'), `time`, `children`
- **Purpose**: Reusable chat message with metadata

#### Source
- **Props**: `icon`, `title`, `detail`
- **Purpose**: Reference to a knowledge source with clickable expand

#### Metric
- **Props**: `icon`, `label`, `value`, `change`
- **Purpose**: KPI card with icon and metadata

## Data Flow

### Types (types.ts)
- `View`: 'inbox' | 'customer' | 'knowledge' | 'analytics'
- `Conversation`: Customer conversation data
- `KnowledgeItem`: Document metadata
- `QualityTrendData`, `TopicData`: Chart data
- `ChatMessage`: Message in conversation

### Constants (constants.ts)
- `conversations`: Array of sample conversations
- `knowledgeItems`: Array of sample knowledge docs
- `qualityTrend`: Chart data for quality trend
- `topicData`: Chart data for top topics
- `navItems`: Navigation menu items

## Key Improvements

✅ **Separation of Concerns** - Each component has a single, clear responsibility
✅ **Reusability** - Common components can be used across views
✅ **Maintainability** - Easy to find and modify specific UI sections
✅ **Type Safety** - Props are fully typed with TSX interfaces
✅ **Scalability** - Easy to add new views or features
✅ **Code Organization** - Logical folder structure mirrors UI structure
✅ **Import Convenience** - Index files provide clean import paths

## Usage Examples

### Import patterns
```typescript
// Layout
import { Sidebar, Topbar } from '@/components/Layout'

// Full views
import { AgentWorkspace } from '@/components/AgentWorkspace'
import { CustomerChat } from '@/components/CustomerChat'
import { KnowledgeBase } from '@/components/KnowledgeBase'
import { Analytics } from '@/components/Analytics'

// Common components
import { Message, Source, Metric } from '@/components/Common'

// Types and constants
import { View, Conversation } from '@/types'
import { conversations, knowledgeItems } from '@/constants'
```

## Component Communication

- **Parent State**: App.tsx manages all state and passes as props
- **Event Handlers**: Components use callbacks to notify parent of changes
- **No Context API needed yet**: Simple state management via props works well for current complexity

## Future Enhancements

- Extract state management to Redux/Zustand if complexity grows
- Add error boundaries for robust error handling
- Create story files (Storybook) for component documentation
- Add unit tests for each component
- Implement data fetching with React Query
