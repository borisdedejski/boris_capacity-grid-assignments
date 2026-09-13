# Decisions

Step 1: 
- First step for me is seting up the project and the criteria: 
    - Setting up the API documentation, so that we can be aware of how the API evolves
    - Setting up additional libraries that I'd need for example: TanStack / React Query owns all data from the server, Zustand only holds screen state
    and Zod checks data at two points. Every API response is checked against a schema before the components see it. 
    - Setting up theming to make it look nicer
    - Setting up TDD, test driven development 


## What did the spec not tell you?

- Styling/theming: spec didn't specificy 
- API documentation: spec didn't require it, but I think it's worth having and having a glance on 
how your API is design I think its improtant
- Performance: spec didn't set any performance targets or constraints.
- Validation: spec didn't specify a validation strategy. I want to do validation on both side FE & BE so that we have
isolation and not trusting one side. So I'd use Zod to validate the schema on the FE. 
- Tests: spec didn't specify test coverage, unit/integration/e2e test? 
- 

## What did you notice that looked wrong?

Anything in the output that didn't match what you expected. Whether you fixed it or left
it, we want to know you saw it.

-

## What did the AI get wrong that you caught?

One concrete example. Every real session has one.

-

## What would you do differently with a week?

-
