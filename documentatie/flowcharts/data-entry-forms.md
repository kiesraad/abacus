# Data Entry Forms

This page describes the navigation and rendering logic of the data entry forms.

An important thing to keep in mind when reading these diagrams is that a user can only move on to the next form after resolving all errors (if any) and accepting all warnings (if any). So it should not be possible that any form previous to the current one has any errors or unaccepted warnings.


## Questions
- Where does "cache input" happen in these flows? After each keystroke?


## Render navigation menu

Render happens based on last received API response.

```mermaid
flowchart TD
    %% elements
    flow-start([start])

    disabled-styling([disabled styling])
    current-styling([current styling])
    unsubmitted-styling([unsubmitted styling])
    error-styling([error styling])
    warning-styling([warning styling])
    empty-styling([empty styling])
    green-check-styling([valid styling])

    page-visited{page visited before?}
    current-page{current page?}
    submitted{submitted?}

    errors{errors?}
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

    render-empty-fields([render with empty fields])
    render-cached-data([render with cached data])
    flow-end([end])

    render-submitted-data([render with submitted data])

    show-error([show error])
    hide-checkbox-accepted(["hide checkbox
        warnings accepted"])
    show-warning([show warning])
    show-checked-accepted(["show checked checkbox
        warnings accepted"])
    show-unchecked-accepted(["show unchecked checkbox
        warnings accepted"])

    page-submitted{page submitted?}
    error-cur-page{error for current page?}
    warning-cur-page{warning for current page?}
    cached-input-available{cached input available?}
    input-changed{"input changed
        since submit?"}
    warning-accepted{"warning(s) accepted?"}

    %% flow
    flow-start --> page-submitted

    page-submitted -- no --> cached-input-available
    cached-input-available -- yes --> render-cached-data
    cached-input-available -- no --> render-empty-fields
    page-submitted -- yes --> render-submitted-data
    
    render-submitted-data --> error-cur-page

    error-cur-page -- yes --> show-error
    show-error --> flow-end
    error-cur-page -- no --> warning-cur-page

    warning-cur-page -- yes --> show-warning
    show-warning --> input-changed
    input-changed -- yes --> hide-checkbox-accepted
    hide-checkbox-accepted --> flow-end
    input-changed -- no --> warning-accepted
    warning-accepted -- yes --> show-checked-accepted
    warning-accepted -- no --> show-unchecked-accepted
    show-checked-accepted --> flow-end
    show-unchecked-accepted --> flow-end
    warning-cur-page -- no --> flow-end
```


## Click "Volgende"

```mermaid
flowchart TD

    %% elements
    flow-start([start])
    go-to-prev-page([go to previous page])
    abort-input([abort input])

    error-any-prev-page{"error for any
        previous page?"}
    error-cur-page{"error for 
        current page?"}
    warning-cur-page{"warning for
        current page?"}
    warnings-accepted{"warning(s) accepted?"}
    user-addresses-error{user addresses error}

    user-addresses-warning{user addresses warning}

    click-next(click next)
    call-api(call api)
    change-input(change input)
    accept-warning(accept warning)

    go-to-next-page([go to next page])

    %% flow
    flow-start --> click-next
    click-next --> call-api
    call-api --> error-any-prev-page

    error-any-prev-page -- yes --> go-to-prev-page

    error-any-prev-page -- no --> error-cur-page

    error-cur-page -- yes --> user-addresses-error
    
    user-addresses-error -- abort --> abort-input
    user-addresses-error -- resolve --> change-input
    change-input --> click-next

    error-cur-page -- no --> warning-cur-page
    warning-cur-page -- yes --> warnings-accepted
    warnings-accepted -- no --> user-addresses-warning
    warnings-accepted -- yes --> go-to-next-page
    user-addresses-warning -- resolve --> change-input
    user-addresses-warning -- accept --> accept-warning
    accept-warning --> click-next
    user-addresses-warning -- abort --> abort-input

    warning-cur-page -- no --> go-to-next-page

```

Note that if there is a warning and the user changes the input, they should no longer have the option to accept the warning. They need to click "Next" first, to validate the changed input.


## Click navigation item or browser back/forward buttons

```mermaid
flowchart TD
    %% start and end
    flow-start([start])

    go-to-page([go to selected page])
    remain-on-page([remain on current page])

    %% steps
    click-nav-item(click navigation item)
    click-browser-back("click browser
        back button")
    click-browser-forward("click browser
        forward button")
    on-furthest-page{on furthest page?}
    user-made-changes{user made changes?}
    save-changes{save changes?}
    call-api(call api)
    cache-input(cache input)
    reset-changes(reset changes)
    errors-or-warnings{errors or warnings?}

    %% flow
    flow-start --> click-nav-item
    flow-start --> click-browser-back
    flow-start --> click-browser-forward
    click-browser-back --> on-furthest-page
    %% if you can click the browser forward button, you by definition are not on the furthest page
    click-browser-forward --> user-made-changes
    click-nav-item --> on-furthest-page
    on-furthest-page -- yes --> cache-input
    cache-input --> go-to-page

    on-furthest-page -- no --> user-made-changes
    user-made-changes -- no --> go-to-page
    user-made-changes -- yes --> save-changes
    save-changes -- no --> reset-changes
    reset-changes --> go-to-page
    save-changes -- yes --> call-api
    call-api --> errors-or-warnings
    errors-or-warnings -- no --> go-to-page
    errors-or-warnings -- yes --> remain-on-page

```
