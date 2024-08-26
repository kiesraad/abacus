# Data Entry Forms

This page describes the navigation and rendering logic of the data entry forms through the following flow charts:

- __Render navigation menu__: styling of the different items in the left-hand navigation menu
- __Render form__: rendering of the different forms for data entry
- __Click "Volgende"__: what should happen when the user clicks the "Volgende" ("Next") button
- __Navigate away from page__: what should happen when the user navigates away from the page in any other way than clicking the "Volgende" button

An important thing to keep in mind when reading these diagrams is that a user can only proceed to the next form by clicking "Volgende" after they have resolved all errors (if any) and accepted all warnings (if any).


## Questions
- Where does "cache input" happen in these flows? After each keystroke?


## Render navigation menu

Render happens based on last received API response.

```mermaid
flowchart TD
    %% elements
    flow-start([start])

    styling-disabled([styling: disabled])
    styling-current([styling: current])
    styling-unsubmitted([styling: unsubmitted])
    styling-error([styling: error])
    styling-warning([styling: warning])
    styling-empty([styling: empty])
    styling-valid([styling: valid])

    page-visited{page visited before?}
    current-page{current page?}
    submitted{submitted?}

    errors{errors?}
    warnings{warnings?}
    empty{empty?}

    %% flow
    flow-start --> page-visited
    page-visited -- no --> styling-disabled
    page-visited -- yes --> current-page
    current-page -- yes --> styling-current
    current-page -- no --> submitted
    submitted -- no --> styling-unsubmitted
    submitted -- yes --> errors
    errors -- yes --> styling-error
    errors -- no --> warnings
    warnings -- yes --> styling-warning
    warnings -- no --> empty
    empty -- yes --> styling-empty
    empty -- no --> styling-valid
```

## Render form

Render happens based on last received API response.

```mermaid
flowchart TD

    %% elements
    flow-start([start])
    flow-done([done])

    render-empty-fields([render with empty fields])
    render-cached-data([render with cached data])

    render-submitted-data([render with submitted data])

    show-error([show error])
    hide-checkbox-accepted(["hide checkbox warnings accepted"])
    show-warning([show warning])
    show-checked-accepted(["show checked checkbox warnings accepted"])
    show-unchecked-accepted(["show unchecked checkbox warnings accepted"])

    page-submitted{page submitted?}
    error-cur-page{error for current page?}
    warning-cur-page{warning for current page?}
    cached-input-available{cached input available?}
    input-changed{"input changed since submit?"}
    warning-accepted{"warning(s) accepted?"}

    %% flow
    flow-start --> page-submitted

    page-submitted -- no --> cached-input-available
    cached-input-available -- yes --> render-cached-data
    cached-input-available -- no --> render-empty-fields
    page-submitted -- yes --> render-submitted-data
    
    render-submitted-data --> error-cur-page

    error-cur-page -- yes --> show-error
    show-error --> flow-done
    error-cur-page -- no --> warning-cur-page

    warning-cur-page -- yes --> show-warning
    show-warning --> input-changed
    input-changed -- yes --> hide-checkbox-accepted
    hide-checkbox-accepted --> flow-done
    input-changed -- no --> warning-accepted
    warning-accepted -- yes --> show-checked-accepted
    warning-accepted -- no --> show-unchecked-accepted
    show-checked-accepted --> flow-done
    show-unchecked-accepted --> flow-done
    warning-cur-page -- no --> flow-done
```

## Click "Volgende"

```mermaid
flowchart TD

    %% elements
    flow-start([start])
    go-to-prev-page([go to previous page])
    abort-input([abort input])

    error-any-prev-page{"error for any previous page?"}
    error-cur-page{"error for current page?"}
    warning-cur-page{"warning for current page?"}
    warnings-accepted{"warning(s) accepted?"}
    user-addresses-error{user addresses error}

    user-addresses-warning{user addresses warning}

    next-button(next button)
    call-api(call api)
    change-input(change input)
    accept-warning(accept warning)

    go-to-next-page([go to next page])

    %% flow
    flow-start --> next-button
    next-button --> call-api
    call-api --> error-any-prev-page

    error-any-prev-page -- yes --> go-to-prev-page

    error-any-prev-page -- no --> error-cur-page

    error-cur-page -- yes --> user-addresses-error
    
    user-addresses-error -- abort --> abort-input
    user-addresses-error -- resolve --> change-input
    change-input --> next-button

    error-cur-page -- no --> warning-cur-page
    warning-cur-page -- yes --> warnings-accepted
    warnings-accepted -- no --> user-addresses-warning
    warnings-accepted -- yes --> go-to-next-page
    user-addresses-warning -- resolve --> change-input
    user-addresses-warning -- accept --> accept-warning
    accept-warning --> next-button
    user-addresses-warning -- abort --> abort-input

    warning-cur-page -- no --> go-to-next-page
```

Note that if there is a warning and the user changes the input, they should no longer have the option to accept the warning. They need to click "Next" first, to validate the changed input.

## Navigate away from page

```mermaid
flowchart TD
    %% start and end
    flow-start([start])

    go-to-page([go to selected page])
    remain-on-page([remain on current page])

    %% steps
    nav-item(click navigation item)
    browser-back("click browser back button")
    link-in-error-or-warning("click link in error or warning")
    browser-forward("click browser forward button")
    on-furthest-page{on furthest page?}
    user-made-changes{user made changes?}
    save-changes{save changes?}
    call-api(call api)
    cache-input(cache input)
    reset-changes(reset changes)
    errors-or-warnings{errors or warnings?}

    %% flow
    flow-start --> nav-item
    flow-start --> browser-back
    flow-start --> browser-forward
    flow-start --> link-in-error-or-warning
    %% if you can click the browser forward button, you by definition are not on the furthest page
    browser-forward --> user-made-changes
    nav-item --> on-furthest-page
    link-in-error-or-warning --> on-furthest-page
    browser-back --> on-furthest-page
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
