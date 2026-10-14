# Project Brief - Eraser.io Clone

## Project Overview

This project is a fully functional clone of [Eraser.io](https://eraser.io) - a collaborative diagramming tool that enables real-time collaboration on whiteboards and documents. The application combines canvas-based drawing (like Figma/Miro) with rich text editing capabilities.

## Core Requirements

### Primary Goals
1. **Real-time Collaboration**: Multiple users can work simultaneously on the same document/canvas
2. **Canvas Drawing**: Whiteboard functionality using Excalidraw for diagramming
3. **Rich Text Editing**: Document editing capabilities using EditorJS
4. **Team Management**: Multi-tenant architecture with teams and workspaces
5. **File Management**: Organize files within team workspaces

### Key Features
- **Live Collaboration**: Real-time cursors, user presence, conflict resolution
- **Canvas Tools**: Drawing, shapes, connectors, text annotations
- **Document Editor**: Rich text with headers, lists, code blocks
- **Teams & Workspaces**: Multi-tenant structure with role-based access
- **Export Functionality**: PDF, PNG, SVG export capabilities
- **Authentication**: Secure user management and team access control

## Project Scope

### In Scope
- Real-time collaborative canvas and document editing
- Team and workspace management
- File organization and sharing
- Export and import functionality
- User authentication and authorization
- Modern responsive UI/UX

### Out of Scope (Future Enhancements)
- Video/voice chat integration
- Advanced AI features
- Mobile app development
- Enterprise SSO integration
- Advanced analytics and reporting

## Success Criteria

1. **Functional**: All core features working with real-time collaboration
2. **Performance**: Fast loading times and smooth real-time updates
3. **User Experience**: Intuitive interface matching modern design standards
4. **Scalable**: Architecture supports multiple teams and concurrent users
5. **Reliable**: Robust error handling and conflict resolution

## Target Users

- **Design Teams**: For creating wireframes, mockups, and design systems
- **Development Teams**: For architecture diagrams and technical documentation
- **Product Teams**: For user journey mapping and feature planning
- **General Collaboration**: Teams needing visual communication tools

## Technical Constraints

- Must use Next.js 14 with App Router
- Real-time backend must use Convex (not REST APIs)
- Authentication via Kinde
- Canvas functionality via Excalidraw (no custom drawing engine)
- Component library based on shadcn/ui + Radix
- Modern TypeScript throughout

## Project Timeline

This is an ongoing development project focused on iterative enhancement and feature completion. Current status shows most core features implemented with ongoing UI/UX improvements and advanced functionality additions.
