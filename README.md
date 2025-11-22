# Trello Clone

A modern, collaborative task management application built with Next.js, Supabase, and Tailwind CSS. Organize your work with boards, lists, and cards—featuring real-time drag-and-drop, activity tracking, and team collaboration.

## Features

### ✅ Authentication
- Sign up, sign in, and secure session management
- Powered by Clerk authentication
- Stay logged in across sessions

### ✅ Organizations
- Create and manage multiple organizations
- Belong to multiple organizations simultaneously
- Invite team members via email
- Accept invitations through shareable links
- Role-based access (Owner, Admin, Member)

### ✅ Boards
- Create boards within organizations
- Customize board appearance with colors
- Add descriptions to boards
- Organize work by project or team

### ✅ Lists & Cards
- Create lists (columns) within boards
- Add cards (tasks) to lists
- Set card properties:
  - Title and description
  - Priority (Low, Medium, High)
  - Due dates
  - Completion status

### ✅ Drag & Drop
- Reorder lists horizontally
- Move cards between lists
- Reorder cards within lists
- Smooth animations and visual feedback

### ✅ Card Management
- Mark cards as complete with checkbox
- Delete cards with confirmation
- View card activity history
- Track all changes with timestamps

### ✅ Activity Tracking
- View complete activity log for each card
- Track actions: Created, Updated, Moved, Deleted
- See who made changes and when
- Activity timestamps for accountability

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Drag & Drop**: @dnd-kit
- **Email**: Gmail (Nodemailer)

## Prerequisites

Before you begin, ensure you have:
- Node.js (v18 or higher)
- npm or yarn
- A Supabase account
- A Clerk account
- Gmail account for email invitations

## Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd trello_clone
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add:

```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gmail (for email invitations)
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_PASSWORD=your_gmail_app_password

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Set Up Supabase

Create the following tables in Supabase:

#### Organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Organization Members
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'admin')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

#### Boards
```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  user_id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Sectional Columns (Lists)
```sql
CREATE TABLE sectional_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tasks (Cards)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sectional_column_id UUID NOT NULL REFERENCES sectional_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  due_date TIMESTAMP,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  created_by TEXT
);
```

#### Task Activities (History)
```sql
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'moved', 'deleted')),
  changed_by TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Organization Invites
```sql
CREATE TABLE organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'admin')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP
);
```

### 5. Enable RLS Policies

In Supabase, enable Row Level Security (RLS) for all tables and create allow-all policies (backend authorization handles security):

```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectional_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Create allow-all policies for each table
CREATE POLICY "Allow all reads" ON organizations FOR SELECT USING (true);
CREATE POLICY "Allow all inserts" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates" ON organizations FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes" ON organizations FOR DELETE USING (true);

-- Repeat similar policies for other tables...
```

### 6. Run the Application

```bash
npm run dev
```

The application will start at `http://localhost:3000`

## How to Use

### Getting Started

1. **Sign Up**: Create an account using email or social auth
2. **Create Organization**: From the dashboard, click "New Organization"
3. **Invite Team Members**: Go to your organization and click "Invite Members"
4. **Create Board**: From the organization, click "View Boards" then "New Board"
5. **Create Lists**: On your board, click "+ Add List"
6. **Add Cards**: Click "+ Add Card" to create tasks

### Managing Cards

- **Drag to Reorder**: Drag cards within a list to reorder them
- **Move Between Lists**: Drag cards to move them to different lists
- **Mark Complete**: Click the checkbox on a card to mark it as done
- **View History**: Click the 📋 icon to see card activity
- **Delete**: Click the × button to delete a card

### Managing Lists

- **Drag to Reorder**: Drag lists horizontally to reorder them
- **Delete**: Click the × on a list to delete it (cards will be deleted too)

### Inviting Team Members

1. Go to your organization
2. Click "+ Invite Members"
3. Enter their email address and select a role
4. They'll receive an email with an invitation link
5. Click the link to join your organization

## Project Structure

```
trello_clone/
├── app/
│   ├── api/               # API routes
│   ├── board/            # Board detail pages
│   ├── org/              # Organization pages
│   ├── dashboard/        # Dashboard page
│   └── invite/           # Invite acceptance page
├── components/           # React components
├── lib/                  # Utilities and helpers
├── types/               # TypeScript types
└── public/              # Static assets
```

## API Endpoints

### Organizations
- `GET /api/organizations` - Get user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get organization details
- `DELETE /api/organizations/[id]` - Delete organization

### Boards
- `GET /api/organizations/[id]/boards` - Get boards in organization
- `POST /api/organizations/[id]/boards` - Create board
- `DELETE /api/organizations/[id]/boards/[boardId]` - Delete board

### Lists
- `GET /api/boards/[id]/lists` - Get lists with cards
- `POST /api/boards/[id]/lists` - Create list
- `DELETE /api/boards/[id]/lists/[listId]` - Delete list
- `PATCH /api/boards/[id]/lists/[listId]/sort` - Update list sort order

### Cards
- `POST /api/boards/[id]/lists/[listId]/cards` - Create card
- `DELETE /api/boards/[id]/lists/[listId]/cards/[cardId]` - Delete card
- `PATCH /api/boards/[id]/lists/[listId]/cards/[cardId]/complete` - Toggle completion
- `PATCH /api/boards/[id]/lists/[listId]/cards/[cardId]/move` - Move card to different list
- `GET /api/boards/[id]/lists/[listId]/cards/[cardId]/activities` - Get card history

### Invites
- `POST /api/organizations/[id]/invites` - Send invite
- `GET /api/organizations/[id]/invites` - Get pending invites
- `DELETE /api/organizations/[id]/invites/[inviteId]` - Cancel invite
- `POST /api/invites/[token]/accept` - Accept invite

## Troubleshooting

### Issue: "Invalid source map" errors
**Solution**: Delete `.next` folder and restart dev server
```bash
rm -rf .next
npm run dev
```

### Issue: Gmail emails not sending
**Solution**: Use an app password instead of regular password. Enable 2FA and generate an app password in Gmail settings.

### Issue: Drag and drop not working
**Solution**: Clear browser cache and restart dev server. Ensure @dnd-kit packages are installed correctly.

### Issue: "Unauthorized" API errors
**Solution**: Verify Supabase URL and API keys in `.env.local` are correct.

## Future Enhancements

- [ ] Beautiful homepage redesign
- [ ] Card comments and collaboration
- [ ] Due date notifications
- [ ] Kanban board filtering and search
- [ ] Dark mode
- [ ] Mobile app
- [ ] Real-time updates with Supabase subscriptions
- [ ] Export boards to CSV/PDF
- [ ] Card attachments

## Contributing

Feel free to fork this project and submit pull requests for any improvements.

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please open an issue on GitHub.

---

**Made with ❤️ using Next.js and Supabase**