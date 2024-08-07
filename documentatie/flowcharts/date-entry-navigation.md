# Data Entry Navigation

## Questions
- Where does "cache input" happen in the basic happy path flow?

## Render page

Render happens based on last received API response

```mermaid
flowchart TD

    %% elements
    %% render-errors
    %% render-warnings
    %% fill-cached-data
    flow-start([start])
    flow-end([end])

    fill-cached-data
    show-error

    errors{errors?}
    error-cur-page{error-cur-page?}

    cur-page-submitted{cur-page-submitted?}

    warnings{warnings?}

    %% flow
    flow-start --> errors

    errors -- yes --> error-cur-page
    error-cur-page -- yes --> cur-page-submitted
    cur-page-submitted -- yes --> show-error
    cur-page-submitted -- no --> warnings


    errors -- no --> warnings

    warnings -- no --> fill-cached-data

    show-error --> fill-cached-data

    fill-cached-data --> flow-end

```

---



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


---



## Click nav item

```mermaid
flowchart TD
    %% elements
    click-nav-item
    save-changes{save-changes?}
    go-to-page
    cache-input

    %% flow
    click-nav-item --> save-changes
    save-changes -- no --> go-to-page
    save-changes -- yes --> cache-input
    cache-input --> go-to-page
```
