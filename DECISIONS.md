# Decisions

Step 1: 
- First step for me is seting up the project and the criteria: 
    - Setting up the API documentation, so that we can be aware of how the API evolves
    - Setting up additional libraries that I'd need for example: TanStack / React Query owns all data from the server, Zustand only holds screen state
    and Zod checks data at two points. Every API response is checked against a schema before the components see it. 
    - Setting up theming to make it look nicer
    - Setting up TDD, test driven development 

Step 2: 
- Setting up the API
  - Add GET /api/capactiy 
  - Add PATCH /api/people/{id} and add them in the api docs

- Another agent in meantime is preparing the contract / handshake beteween BE / FE. so building an dpreparing the user interface

## What did the spec not tell you?

- Styling/theming: spec didn't specificy 
- API documentation: spec didn't require it, but I think it's worth having and having a glance on 
how your API is design I think its improtant
- Performance: spec didn't set any performance targets or constraints.
- Validation: spec didn't specify a validation strategy. I want to do validation on both side FE & BE so that we have
isolation and not trusting one side. So I'd use Zod to validate the schema on the FE. 
- Tests: spec didn't specify test coverage, unit/integration/e2e test? 
- display in a week range. But should it be possible in a month or ssomething. in day? what is a week range
- should we write on which project the person is busy so that we get a celarer overivew?


## What did you notice that looked wrong?

Anything in the output that didn't match what you expected. Whether you fixed it or left
it, we want to know you saw it.

-

## What did the AI get wrong that you caught?

One concrete example. Every real session has one.

- on refresh it starts from 29 december for some reason 
- not a clear table (where should we edit this team capacity)
- not clear ui on where to edit 
- not sortable table 
- not to good for the eye
- Did not did a clear overview of the days, took lot of space for the persons and not on the days which was not very usuable / visible by hear

## What would you do differently with a week?

- 
