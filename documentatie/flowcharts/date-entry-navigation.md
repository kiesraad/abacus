# Data Entry Navigation

## Questions
- Where does "cache input" happen in these flows?
- Is there a different warning icon for accepted versus not-accepted warnings? Or is it not possible to leave a page without accepting the warning? Also, accepting warnings is not yet included in any of the flows.


## Render page

Render happens based on last received API response.

```mermaid
flowchart TD

    %% elements
    flow-start([start])
    flow-end([end])
    illegal-state{{illegal state}}

    show-error
    error-icon-next-page
    %% error-icon-prev-page is illegal state
    error-icon-cur-page

    show-warning
    warning-icon-next-page
    warning-icon-prev-page
    warning-icon-cur-page

    error-next-page{error-next-page?}
    error-prev-page{error-prev-page?}
    error-cur-page{error-cur-page?}

    warning-next-page{warning-next-page?}
    warning-prev-page{warning-prev-page?}
    warning-cur-page{warning-cur-page?}

    cur-page-submitted{cur-page-submitted?}

    fill-cached-input

    %% flow
    flow-start --> error-prev-page

    error-prev-page -- yes --> illegal-state
    error-prev-page -- no --> error-next-page

    error-next-page -- yes --> error-icon-next-page
    error-icon-next-page --> error-cur-page
    error-next-page -- no --> error-cur-page

    error-cur-page -- yes --> cur-page-submitted
    cur-page-submitted -- yes --> error-icon-cur-page
    error-icon-cur-page --> show-error
    cur-page-submitted -- no --> warning-prev-page
    error-cur-page -- no --> warning-prev-page

    warning-prev-page -- no --> warning-next-page
    warning-prev-page -- yes --> warning-icon-prev-page
    warning-icon-prev-page --> warning-next-page

    warning-next-page -- no --> warning-cur-page
    warning-next-page -- yes --> warning-icon-next-page
    warning-icon-next-page --> warning-cur-page

    warning-cur-page -- no --> fill-cached-input
    warning-cur-page -- yes --> warning-icon-cur-page
    warning-icon-cur-page --> show-warning

    show-error --> fill-cached-input
    show-warning --> fill-cached-input

    fill-cached-input --> flow-end

```


## Click "Volgende" and call API

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

    error-prev-page{error-prev-page?}
    error-cur-page{error-cur-page?}
    error-next-page{error-next-page?}
    warnings{warnings?}

    %% flow

    flow-start --> click-next
    click-next --> call-api
    call-api --> error-prev-page
    error-prev-page -- yes --> go-to-prev-page
    go-to-prev-page --> flow-end

    error-prev-page -- no --> error-cur-page

    error-cur-page -- yes --> render-cur-page
    error-cur-page -- no --> error-next-page

    error-next-page -- yes --> warnings
    error-next-page -- no --> warnings

    warnings -- no --> go-to-next-page
    warnings -- yes --> render-cur-page
    
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
