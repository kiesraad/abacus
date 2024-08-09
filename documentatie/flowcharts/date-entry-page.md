# Data Entry Page

This page describes the navigation and rendering logic of the data entry forms.

An important thing to keep in mind when reading these diagrams is that a user can only move on to the next form after resolving all errors (if any) and accepting all warnings (if any). So it should not be possible that any form previous to the current one has any errors or unaccepted warnings.


## ToDo
- update document title and file name to "data entry forms" before un-drafting the PR

## Questions
- Where does "cache input" happen in these flows?


## Render navigation menu

Render happens based on last received API response.

### Description
Evaluate these top to bottom. The first one that evaluates to true is the state of the menu item

1. index of menu-item > furthest page user has seen: `disabled` (no icon, no link)
1. index of menu-item == current: `current` (arrow icon, bold, no link)
1. index of menu-item == furthest: `unsubmitted` (blue dot)
1. page contains errors: error: `error` icon
1. page contains warnings and warnings have been accepted: `warning` (warning icon)
1. submitted data was empty `empty` (dash icon)
1. submitted data was not empty `valid` (green check icon)

### Diagram

```mermaid
flowchart TD
    %% elements
    flow-start([start])

    disabled-styling([disabled-styling])
    current-styling([current-styling])
    unsubmitted-styling([unsubmitted-styling])
    error-styling([error-styling])
    warning-styling([warning-styling])
    empty-styling([empty-styling])
    green-check-styling([green-check-styling])

    page-visited{page-visited?}
    current-page{current-page?}
    submitted{submitted?}

    errors{errros?}
    warnings{warnings?}
    empty{empty?}

    %% flow
    flow-start --> page-visited
    page-visited -- no --> disabled-styling
    page-visited -- yes --> current-page
    current-page -- yes --> current-styling
    current-page -- no --> submitted
    submitted -- no --> unsubmitted-styling
    submitted -- yes --> errors
    errors -- yes --> error-styling
    errors -- no --> warnings
    warnings -- yes --> warning-styling
    warnings -- no --> empty
    empty -- yes --> empty-styling
    empty -- no --> green-check-styling

```


## Render form

Render happens based on last received API response.

```mermaid
flowchart TD

    %% elements
    flow-start([start])

    render-cached-data([render-cached-data])
    render-submitted-data([render-submitted-data])

    show-error
    show-warning

    error-cur-page{error-cur-page?}

    warning-cur-page{warning-cur-page?}

    cur-page-submitted{cur-page-submitted?}

    %% flow
    flow-start --> cur-page-submitted

    cur-page-submitted -- no --> render-cached-data
    cur-page-submitted -- yes --> error-cur-page

    error-cur-page -- yes --> show-error
    show-error --> render-submitted-data
    error-cur-page -- no --> warning-cur-page

    warning-cur-page -- yes --> show-warning
    show-warning --> render-submitted-data
    warning-cur-page -- no --> render-submitted-data
```


## Click "Volgende"


```mermaid
flowchart TD

    %% elements
    flow-start([start])
    go-to-prev-page([go-to-prev-page])
    go-to-next-page([go-to-next-page])

    abort-input([abort-input])
    
    render-error-cur-page
    render-warning-cur-page

    click-next
    call-api

    error-any-prev-page{error-any-prev-page?}
    error-cur-page{error-cur-page?}
    warning-cur-page{warning-cur-page?}

    address-error{handle-error}

    address-warning{handle-warning}

    %% flow
    flow-start --> click-next
    click-next --> call-api
    call-api --> error-any-prev-page

    error-any-prev-page -- yes --> go-to-prev-page

    error-any-prev-page -- no --> error-cur-page

    error-cur-page -- yes --> render-error-cur-page
    render-error-cur-page --> address-error
    
    address-error -- abort --> abort-input
    address-error -- resolve --> change-input
    change-input --> click-next

    error-cur-page -- no --> warning-cur-page
    warning-cur-page -- yes --> render-warning-cur-page
    render-warning-cur-page --> address-warning
    address-warning -- resolve --> change-input
    address-warning -- accept --> accept-warning
    accept-warning --> go-to-next-page
    address-warning -- abort --> abort-input

    warning-cur-page -- no --> go-to-next-page

```


## Click nav item

```mermaid
flowchart TD
    %% start and end
    flow-start([start])

    go-to-page([go-to-page])
    remain-on-page([remain-on-page])

    %% steps
    click-nav-item
    on-furthest-page{on-furthest-page?}
    user-made-changes{user-made-changes?}
    save-changes{save-changes?}
    api-call
    cache-input
    reset-changes
    errors-or-warnings{errors-or-warnings?}

    %% flow
    flow-start --> click-nav-item
    click-nav-item --> on-furthest-page
    on-furthest-page -- yes --> cache-input
    cache-input --> go-to-page

    on-furthest-page -- no --> user-made-changes
    user-made-changes -- no --> go-to-page
    user-made-changes -- yes --> save-changes
    save-changes -- no --> reset-changes
    reset-changes --> go-to-page
    save-changes -- yes --> api-call
    api-call --> errors-or-warnings
    errors-or-warnings -- no --> go-to-page
    errors-or-warnings -- yes --> remain-on-page

```
