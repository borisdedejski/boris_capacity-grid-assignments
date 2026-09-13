# Decisions


## How I worked

First step for me was to understand the project and the scope. From what I saw at first I could notice that the project scope in general isa bit vague  and open for intepratation, so at the same time I wanted to cap the scope, be creative and be fast to come a solution.

### Steps: 
- Define the scope, and setup API documentation. I think it is super important to have your API at glance and to see how it evolovls. API documentation is a must so that you can see what you expect. I ran a agent to create a API documentation first 
- After we have initialized the API documentation, I have setup libraries that I would use. I went for React Query, Zustand, Zod, Tanstack Table, Tailwind with shadcn etc. 
- Here once I have the scope and technologies I would use, I ran 3 separate agents: 
    - Agent 1 to create the API, read the file and create the api
    - Agent 2 to prepare the GRID and the table, using the mcp of Tanstack initialize the GRID and prepare for a "handshake" with the BE, as well as 
    wiring everything up like Tanstack Table, React Query, Zustand, Zod validation etc. (the handshake from the FE)
    - Agent 3 wrinting integration tests to cover scenarios like forexample for the grid search etc. 

## What did the spec not tell you?

- Styling/theming: spec didn't specificy how far we should design or how the UI should look like 
- What should the manager be able to see on this table, like what are the requirements
- API documentation: should we have an API, for us but also for example if we want a third party or other microservice to use this layer somewhere?
- Performance: spec didn't set any performance targets or constraints. How should our solution perform?
- Validation: spec didn't specify a validation strategy. I want to do validation on both side FE & BE.
- Tests: spec didn't specify test coverage, unit/integration/e2e tests
- display in a week range. But should it be possible in a month / in a year, in day? Do we want by day? 
- Do we want to know on which project person is busy, so perhaps we can swap them? 
    - so I saw it's already possible to create an endpoint to know which person is busy at which project at which day, which I think is imporant for manager to have at glance. So here I went to implement a second API endpoint
    - I also here created a view/tooltip on which day the user is busy at
- Sorting / filtering / over-allocated. What do we want to filter/sort on so that we can have at glance 
- What do managers see this on? Tablet / Desktop / Mobile? What device should this be optimzed for? 

## What did you notice that looked wrong?

- Slow load and lagging controls.
    - The first version put all 500 rows in the page at once, each with several popovers. Changing the week froze the screen.
    - Fixed with virtualised rows: only the rows in view are in the page. Plus caching, so going back to a week you saw sends nothing.
- Search was heavy.
    - Every keystroke re-filtered and re-drew the whole grid. Nothing was sent to the API, but it still lagged.
    - Fixed with a debounce: the filter runs only when you stop typing. Enter and clear apply at once.
- Sorting was slow.
    - Same cause: 500 rows re-drawn on every sort.
    - Fixed by the same virtualisation. Sorting still runs over everyone, only the drawing is smaller.

## What did the AI get wrong that you caught?

- Loaded everything at once. All 500 rows in the page, each with popovers. Heavy and slow. Fixed with virtualised rows.
- Wrong start date. On refresh the grid opened on 29 December because the date was hard-coded. Fixed: it opens on this week.
- Bad first table. The hand-made table was hard to read and had no sorting. I switched to TanStack Table right away.
- No clear place to edit. You could not tell where to change someone's hours. Fixed: the capacity is a button with a pencil, and double-click on a row works too.
- Weak filtering. Fixed: search by name, an "over-allocated only" switch, and sort on every column.
- Bad layout. People got most of the space and the weeks got very little, so the numbers were hard to see. Fixed.
- Search on every keystroke. It re-filtered and re-drew the whole grid each time you typed. Fixed with a debounce: it runs when you stop typing.

## What would you do differently with a week?

- Talk to a manager first. Ask what "week" and "capacity" mean for them, instead of reading it from the data. Understanding the problem deeply
- Time off and holidays change the capactity per week, it is not accounted here. The API shape is ready for a `capacity` list per person. 
- Safer edits, what if 2 managers edit at the same time? Currently, the last save wins, add some versioning there. 
- Timeout on the capactiy query so that if BE fails, it is clear to the user
- Real browser tests with playwright
- Pagining for very big teams
- Day and month view not only weeks. Filtering by project maybe as well. Sharing a range in a url / persisting filters.
- Implementing a swap maybe so that you can quickly swap a compatible colleagues on a project. Filter colleagues by project so that you can see more overlap. 
- Adapt it much more for mobile & tablet, if the managers use it there as well
- A person page
- A history sidebar, events written by patch. For example who changed whose hours, from what to what and when. Also enable undo. But history and events is really important for these views i think 
- Warnings before allocation happen 
- Notifications/toasts on success/error failures of those
- Exporting a CSV 
- Keyboard navigation 
- Roles (for example: only manager role or more will be able to adjust allocation)

