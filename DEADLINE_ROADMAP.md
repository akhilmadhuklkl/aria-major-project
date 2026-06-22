# ARIA Fast-Track Deadline Roadmap

Current date: 04 June 2026

Important academic deadlines from the guideline PDF:

- Interim Report: 19 June 2026
- Final Report: 24 July 2026
- Final Review, Presentation, Code Review, Demo, Viva: 25 July 2026 onwards

## Evaluation Weightage

Continuous Evaluation: 30%

- Project Proposal: 10%
- Interim Report: 20%

End Semester Evaluation: 70%

- Code review and application demo: 20%
- Use of advanced tools, research depth, novelty: 10%
- Testing, validation, and test results: 10%
- Final report: 10%
- Presentation and viva voce: 20%

## What Must Be Ready By 19 June 2026

The guideline says the interim report must include:

- Problem statement
- Background work
- Related work
- High-level design
- Modules/algorithms to be implemented

To make the submission stronger, we should also include:

- Objectives
- Scope
- Requirement analysis
- System architecture diagram
- Use case diagram
- Sequence diagrams
- Database design / ER diagram
- Module breakdown
- Technology stack
- Implementation progress screenshots
- Updated project timeline

The application does not need to be fully completed by 19 June. But we should have a working early prototype so the report looks credible.

## Minimum Prototype For 19 June

Build these before the interim report:

1. React project scaffold.
2. ARIA customer chat UI.
3. Agent-assist UI mock screen.
4. Analytics dashboard mock screen.
5. Knowledge base screen mock or simple CRUD.
6. Mock AI response service.
7. Feedback rating UI.
8. Screenshots for report.

Optional if time permits:

- Mastra AI basic agent setup.
- Real LLM response for chat.
- Local database persistence.

## What Must Be Ready By 24 July 2026

The final report must amend the interim report with:

- Methodologies
- Algorithms/tools developed
- Implementation details
- Future scope
- Conclusion

For marks, the final project should include:

- Working customer chat.
- Mastra AI agent integration.
- Knowledge base retrieval.
- Agent-assist mode with editable AI suggestions.
- Feedback collection.
- Scoring/adaptive learning logic.
- Analytics dashboard.
- Testing and validation results.
- Final report.
- Final presentation.
- Demo script.

## Fastest Build Strategy

Phase 1: Documentation and UI-first prototype

- Goal: secure interim report marks.
- Build visible screens quickly.
- Use mock AI responses first.
- Prepare diagrams and report content.

Phase 2: Backend and Mastra integration

- Add chat API.
- Add Mastra support agent.
- Add LLM provider integration.
- Add persistence for conversations and feedback.

Phase 3: Adaptive features and analytics

- Add knowledge base.
- Add retrieval-based context.
- Add feedback scoring.
- Add dashboard metrics and charts.

Phase 4: Final polish

- Testing.
- Bug fixes.
- Screenshots.
- Final report.
- Presentation and viva preparation.

## Day-by-Day Plan Until Interim Report

### 04 June

- Read proposal and guidelines.
- Finalize exact project scope.
- Prepare fast-track plan.

### 05 June

- Scaffold React + TypeScript app.
- Add Tailwind.
- Create layout and navigation.

### 06 June

- Build customer chat UI.
- Add mock support responses.
- Add feedback rating and comment controls.

### 07 June

- Build agent workspace UI.
- Add suggested response editor.
- Add accept, edit, reject, regenerate actions.

### 08 June

- Build analytics dashboard UI.
- Add charts/cards using mock data.

### 09 June

- Build knowledge base screen.
- Add sample FAQ/policy content.

### 10 June

- Add backend/API structure.
- Add mock chat endpoint.
- Save basic conversations locally or in database.

### 11 June

- Initialize Mastra.
- Create basic ARIA support agent.
- Test agent with mock or real provider.

### 12 June

- Connect chat UI to backend.
- Add response saving and feedback saving.

### 13 June

- Prepare diagrams: architecture, use case, sequence, ER diagram.

### 14 June

- Draft interim report chapters.

### 15 June

- Add screenshots and implementation progress section.

### 16 June

- Review report against guideline requirements.
- Improve high-level design and modules/algorithm section.

### 17 June

- Polish prototype UI.
- Fix obvious bugs.

### 18 June

- Final proofread.
- Export report.
- Prepare submission files.

### 19 June

- Submit interim report before LMS deadline.

## Recommended Interim Report Chapters

1. Title Page
2. Abstract
3. Introduction
4. Problem Statement
5. Objectives
6. Background Study
7. Related Work
8. Requirement Analysis
9. Proposed System
10. High-Level System Design
11. Module Description
12. Algorithms / Workflow To Be Implemented
13. Tools And Technologies
14. Implementation Progress
15. Timeline And Milestones
16. Conclusion
17. References

## Risk Control

Main risks:

- Mastra setup may take time.
- API key or billing issues may delay real LLM integration.
- Database/vector search can consume time.

Mitigation:

- Build mock AI first.
- Keep Mastra behind an `AgentService` layer.
- Use local sample knowledge first.
- Add real LLM and semantic retrieval after the UI and report are ready.

