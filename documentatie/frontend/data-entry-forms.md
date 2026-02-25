# Data Entry Forms

This page describes the navigation and rendering logic of the data entry forms through the following flow charts:

- [__Render navigation menu__](#render-navigation-menu): styling of the different items in the left-hand navigation menu
- [__Render form__](#render-form): rendering of the different forms for data entry
- [__Click "Volgende"__](#click-volgende): what should happen when the user clicks the "Volgende" ("Next") button
- [__Navigate away from page__](#navigate-away-from-page): what should happen when the user navigates away from the page in any other way than clicking the "Volgende" button
- [__Abort data entry ("Invoer afbreken")__](#abort-data-entry-invoer-afbreken): what should happen when the user clicks "Invoer afbreken" at the top of the screen

An important thing to keep in mind when reading these diagrams is that a user can only proceed to the next form by clicking "Volgende" after they have resolved or accepted all errors (if any) and warnings (if any).

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
    errors -- yes, accepted --> styling-error
    errors -- yes, not accepted --> styling-error
    errors -- no --> warnings
    warnings -- yes, accepted --> styling-valid
    warnings -- yes, not accepted --> styling-warning
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

    hide-checkbox-accepted(["hide checkbox <br/> errors/warnings accepted"])
    show-errors-warnings([show errors/warnings])
    show-checked-accepted(["show checked checkbox <br/> errors/warnings accepted"])
    show-unchecked-accepted(["show unchecked checkbox <br/> errors/warnings accepted"])

    page-submitted{page submitted?}
    errors-warnings-cur-page{errors/warnings for current page?}
    cached-input-available{cached input available?}
    input-changed{"input changed <br/> since submit?"}
    errors-warnings-accepted{"errors/warnings accepted?"}

    %% flow
    flow-start --> page-submitted

    page-submitted -- no --> cached-input-available
    cached-input-available -- yes --> render-cached-data
    cached-input-available -- no --> render-empty-fields
    page-submitted -- yes --> render-submitted-data
    
    render-submitted-data --> errors-warnings-cur-page
    errors-warnings-cur-page -- yes --> show-errors-warnings
    errors-warnings-cur-page -- no --> flow-done
    
    show-errors-warnings --> input-changed
    input-changed -- yes --> hide-checkbox-accepted
    hide-checkbox-accepted --> flow-done
    input-changed -- no --> errors-warnings-accepted
    errors-warnings-accepted -- yes --> show-checked-accepted
    errors-warnings-accepted -- no --> show-unchecked-accepted
    show-checked-accepted --> flow-done
    show-unchecked-accepted --> flow-done
```

## Click "Volgende"

```mermaid
flowchart TD

    %% elements
    flow-start([start])
    next-button(next button)
    call-api(call API)
    
    errors-warnings-cur-page{"errors/warnings <br/> for current page?"}
    errors-warnings-accepted{"errors/warnings accepted?"}
    user-addresses-errors-warnings{user addresses errors/warnings}

    accept-errors-warnings(accept errors/warnings)
    change-input(change input)
    go-to-next-page([go to next page])

%% flow
    flow-start --> next-button
    next-button --> call-api
    call-api --> errors-warnings-cur-page

    errors-warnings-cur-page -- yes --> errors-warnings-accepted
    errors-warnings-accepted -- no --> user-addresses-errors-warnings
    user-addresses-errors-warnings -- resolve --> change-input
    change-input --> next-button
    user-addresses-errors-warnings -- accept --> accept-errors-warnings
    accept-errors-warnings --> next-button

    errors-warnings-accepted -- yes --> go-to-next-page
    errors-warnings-cur-page -- no --> go-to-next-page

```

- If there is a warning or error and the user changes the input, they should no longer have the option to accept the errors/warnings. They need to click "Next" first, to validate the changed input.

## Navigate away from page

Navigating away from a page can happen in several ways:
- Clicking an item in the left navigation menu
- Clicking a link in an error or warning message
- Clicking a link in the top navigation bar
- Clicking the browser back/forward button


The next page can be either within the form or outside it. The action flow depends on this.

The abort button ("Invoer afbreken") is a special case covered in the next section. The rules in this flowchart do not apply to the abort button.

```mermaid
flowchart TD
    %% start and end
    flow-start([navigate action])
    go-to-page([go to selected page])
    remain-on-page([remain on current page])

    %% steps
    inside-outside{navigating inside form?}
    on-furthest-page{on furthest page?}
    user-made-changes{user made changes?}
    save-changes{"modal: <br/> save changes?"}
    call-save-api(call save api)
    cache-input(cache input)
    reset-changes(reset changes)

    %% flow
    flow-start --> inside-outside
    inside-outside -- outside --> user-made-changes
    inside-outside -- inside --> on-furthest-page
    on-furthest-page -- no --> user-made-changes
    
    user-made-changes -- no --> go-to-page
    user-made-changes -- yes --> save-changes
    save-changes -- yes --> call-save-api
    save-changes -- no --> reset-changes
    save-changes -- close × --> remain-on-page

    on-furthest-page -- yes --> cache-input
    cache-input --> go-to-page
    reset-changes --> go-to-page
    call-save-api --> go-to-page
```

# Abort data entry ("Invoer afbreken")

```mermaid
flowchart TD
    %% start
    flow-start([abort data entry])
    
    %% end
    go-to-page([go to polling station selection])
    remain-on-page([remain on current page])

    %% steps
    modal{"modal: <br/> save or delete?"}
    call-save-api(call save api, <br/> include cached data)
    call-delete-api(call delete api)

    %% flow
    flow-start --> modal
    modal -- save --> call-save-api
    modal -- delete --> call-delete-api
    modal -- close × --> remain-on-page
    call-save-api --> go-to-page
    call-delete-api --> go-to-page
```
