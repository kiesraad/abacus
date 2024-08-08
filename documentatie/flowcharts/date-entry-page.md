# Data Entry Page

## TODO
- add dash icon in "Render navigation menu" for forms with all fields filled with `0`
- add blue circle icon in "Render navigation menu" for forms that some field(s) filled in, but nothing submitted

## Questions
- Where does "cache input" happen in these flows?
- Is there a different warning icon for accepted versus not-accepted warnings? Or is it not possible to leave a page without accepting the warning? Also, accepting warnings is not yet included in any of the flows.


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
    flow-start([start])

    flow-start --> page-visited{page-visited?}
    page-visited -- no --> disabled-styling
    page-visited -- yes --> current-page{current-page?}
    current-page{current-page?} -- yes --> current-styling
    current-page -- no --> submitted{submitted?}
    submitted -- no --> unsubmitted-styling
    submitted -- yes --> errors{errors?}
    errors -- yes --> error-styling
    errors -- no --> warnings{warnings?}
    warnings -- yes --> warning-styling
    warnings -- no --> empty{empty? }
    empty -- yes --> empty-styling
    empty -- no --> green-check-styling

```


## Render form

Render happens based on last received API response.

```mermaid
flowchart TD

    %% elements
    flow-start([start])
    flow-end([end])
    illegal-state{{illegal state}}

    show-error
    show-warning

    error-any-prev-page{error-any-prev-page?}
    error-cur-page{error-cur-page?}

    warning-cur-page{warning-cur-page?}

    cur-page-submitted-error{cur-page-submitted?}
    cur-page-submitted-warning{cur-page-submitted?}

    fill-cached-input

    %% flow
    flow-start --> error-any-prev-page

    error-any-prev-page -- yes --> illegal-state
    error-any-prev-page -- no -->  error-cur-page

    error-cur-page -- yes --> cur-page-submitted-error
    cur-page-submitted-error -- yes --> show-error
    cur-page-submitted-error -- no --> warning-cur-page
    error-cur-page -- no --> warning-cur-page

    warning-cur-page -- no --> fill-cached-input
    warning-cur-page -- yes --> cur-page-submitted-warning
    
    cur-page-submitted-warning -- yes --> show-warning
    cur-page-submitted-warning -- no --> fill-cached-input

    show-error --> fill-cached-input
    show-warning --> fill-cached-input

    fill-cached-input --> flow-end

```


## Click "Volgende"

```mermaid
flowchart TD

    %% elements
    flow-start([start])
    flow-end([end])

    click-next
    call-api
    go-to-prev-page
    go-to-next-page
    render-cur-page

    error-any-prev-page{error-any-prev-page?}
    error-cur-page{error-cur-page?}
    warning-cur-page{warning-cur-page?}

    %% flow
    flow-start --> click-next
    click-next --> call-api
    call-api --> error-any-prev-page
    error-any-prev-page -- yes --> go-to-prev-page
    go-to-prev-page --> flow-end

    error-any-prev-page -- no --> error-cur-page

    error-cur-page -- yes --> render-cur-page
    error-cur-page -- no --> warning-cur-page

    warning-cur-page -- yes --> render-cur-page
    warning-cur-page -- no --> go-to-next-page
    
    go-to-next-page --> flow-end
    render-cur-page --> flow-end

```


## Click nav item

```mermaid
flowchart TD
    %% elements
    flow-start([start])
    flow-end([end])

    click-nav-item
    save-changes{save-changes?}
    go-to-page
    remain-on-page
    api-call

    errors-or-warnings-cur-page{errors-or-warnings-cur-page?}

    %% flow
    flow-start --> click-nav-item
    click-nav-item --> save-changes
    save-changes -- no --> go-to-page
    save-changes -- yes --> api-call
    api-call --> errors-or-warnings-cur-page
    errors-or-warnings-cur-page -- no --> go-to-page
    errors-or-warnings-cur-page -- yes --> remain-on-page

    go-to-page --> flow-end
    remain-on-page --> flow-end
```
