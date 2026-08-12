# Placeholder modifiers

Placeholders can be transformed inline by adding a modifier after their name.

```
{USER.uppercase}
```

## Chaining

Modifiers can be chained. They're applied from left to right.

```
{MESSAGE.trim.truncate(50)}
{COUNTER_POINTS.add(10).separator}
```

## Arguments

Some modifiers take arguments, written between parentheses and separated by commas.

```
{USER.default(someone)}
{USER_ROLE_SUB.bool(is a sub, is not a sub)}
```

Arguments can be written as is most of the time. Wrap an argument in quotes when it
contains a **comma `,`**, a **bracket `[]`**, a **brace `{}`** or a **quote `"`**:

```
{USER.default("nobody :)")}
{MESSAGE.replace("a, b", "c")}
```

Both `"` and `'` work, as well as the curly quotes `“”`.  
Inside a quoted argument, `\"` writes a literal quote. Every other backslash is kept
as is:

```
{USER.default("say \"hi\"")} => say "hi"
{PATH.default("C:\Users\me")} => C:\Users\me
```

## Writing a literal placeholder

Placeholders are either replaced when they match an existing data, or drop if they don't match anything.  
If you want to actually return something that looks a placeholder without it being dropped, double the braces:

```
{{USER}}   =>   {USER}
```

## Good to know

- Modifier names are **case insensitive**: `{USER.UpperCase}` works.
- An **unknown modifier is ignored**, the value is still inserted.
- A **malformed** modifier is left in place as plain text.
- Modifiers expecting a number leave **non numeric values untouched**.

<!-- INJECT_AFTER -->

## Available modifiers

| Modifier                        | Category          | What it does                                                                                               |
| ------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| [`uppercase`](#uppercase)       | Text              | Converts the value to upper case.                                                                          |
| [`lowercase`](#lowercase)       | Text              | Converts the value to lower case.                                                                          |
| [`capitalize`](#capitalize)     | Text              | Upper cases the first character.                                                                           |
| [`titlecase`](#titlecase)       | Text              | Upper cases the first character of every word.                                                             |
| [`trim`](#trim)                 | Text              | Removes the spaces before and after the value.                                                             |
| [`nospace`](#nospace)           | Text              | Removes every space of the value, not just the surrounding ones.                                           |
| [`reverse`](#reverse)           | Text              | Reverses the value.                                                                                        |
| [`length`](#length)             | Text              | Number of characters of the value.                                                                         |
| [`repeat`](#repeat)             | Text              | Repeats the value.                                                                                         |
| [`truncate`](#truncate)         | Text              | Shortens the value when it's too long and appends an ellipsis.                                             |
| [`left`](#left)                 | Text              | Keeps only the first characters of the value.                                                              |
| [`right`](#right)               | Text              | Keeps only the last characters of the value.                                                               |
| [`padstart`](#padstart)         | Text              | Pads the start of the value until it reaches the requested size.                                           |
| [`padend`](#padend)             | Text              | Pads the end of the value until it reaches the requested size.                                             |
| [`replace`](#replace)           | Text              | Replaces every occurrence of a text by another one.                                                        |
| [`remove`](#remove)             | Text              | Removes every occurrence of a text.                                                                        |
| [`initials`](#initials)         | Text              | Keeps the first letter of every word, upper cased.                                                         |
| [`deaccent`](#deaccent)         | Text              | Removes the accents of the value.                                                                          |
| [`stripemoji`](#stripemoji)     | Text              | Removes every emoji of the value.                                                                          |
| [`striphtml`](#striphtml)       | Text              | Removes the HTML tags of the value.                                                                        |
| [`nourl`](#nourl)               | Text              | Removes every link of the value.                                                                           |
| [`slug`](#slug)                 | Text              | Converts the value to a URL friendly text.                                                                 |
| [`mock`](#mock)                 | Text              | Alternates the case of every character, sPoNgEbOb style.                                                   |
| [`mask`](#mask)                 | Text              | Hides the end of the value behind a repeated character.                                                    |
| [`round`](#round)               | Numbers           | Rounds the number to the closest value.                                                                    |
| [`floor`](#floor)               | Numbers           | Rounds the number down.                                                                                    |
| [`ceil`](#ceil)                 | Numbers           | Rounds the number up.                                                                                      |
| [`abs`](#abs)                   | Numbers           | Removes the sign of the number.                                                                            |
| [`add`](#add)                   | Numbers           | Adds a number to the value.                                                                                |
| [`sub`](#sub)                   | Numbers           | Subtracts a number from the value.                                                                         |
| [`mul`](#mul)                   | Numbers           | Multiplies the value by a number.                                                                          |
| [`div`](#div)                   | Numbers           | Divides the value by a number.                                                                             |
| [`min`](#min)                   | Numbers           | Returns the smallest of the value and the given limit, which effectively caps the value to that limit.     |
| [`max`](#max)                   | Numbers           | Returns the largest of the value and the given limit, which effectively raises the value up to that limit. |
| [`clamp`](#clamp)               | Numbers           | Keeps the value between two limits.                                                                        |
| [`decimals`](#decimals)         | Numbers           | Forces a fixed number of decimals, adding trailing zeros if needed.                                        |
| [`sign`](#sign)                 | Numbers           | Always shows the sign of the number, including the "+" of positives.                                       |
| [`separator`](#separator)       | Numbers           | Groups the digits of large numbers the way the current language does.                                      |
| [`compact`](#compact)           | Numbers           | Shortens large numbers.                                                                                    |
| [`currency`](#currency)         | Numbers           | Formats the number as an amount of money, the way the current language does.                               |
| [`ordinal`](#ordinal)           | Numbers           | Turns the number into a rank, translated to the current language.                                          |
| [`percent`](#percent)           | Numbers           | Converts the value to a percentage of a total.                                                             |
| [`duration`](#duration)         | Date & duration   | Converts a number of milliseconds to a readable duration.                                                  |
| [`date`](#date)                 | Date & duration   | Converts a timestamp to a date, written the way the current language does.                                 |
| [`time`](#time)                 | Date & duration   | Converts a timestamp to a time of the day, written the way the current language does.                      |
| [`datetime`](#datetime)         | Date & duration   | Converts a timestamp to a date and a time, written the way the current language does.                      |
| [`ago`](#ago)                   | Date & duration   | Converts a timestamp to how long ago it was, translated to the current language.                           |
| [`first`](#first)               | Lists             | First entry of a coma separated value.                                                                     |
| [`last`](#last)                 | Lists             | Last entry of a coma separated value.                                                                      |
| [`nth`](#nth)                   | Lists             | One specific entry of a coma separated value.                                                              |
| [`count`](#count)               | Lists             | How many entries a coma separated value holds.                                                             |
| [`join`](#join)                 | Lists             | Rewrites a coma separated value with another separator.                                                    |
| [`sort`](#sort)                 | Lists             | Sorts the entries of a coma separated value alphabetically.                                                |
| [`unique`](#unique)             | Lists             | Removes the duplicated entries of a coma separated value.                                                  |
| [`shuffle`](#shuffle)           | Lists             | Randomizes the order of the entries of a coma separated value.                                             |
| [`split`](#split)               | Lists             | Cuts the value on a separator and keeps one of the chunks.                                                 |
| [`default`](#default)           | Logic             | Replaces the value by a fallback when it's empty.                                                          |
| [`bool`](#bool)                 | Logic             | Converts a true/false value to your own words.                                                             |
| [`plural`](#plural)             | Logic             | Picks the singular or the plural word matching the number.                                                 |
| [`equals`](#equals)             | Logic             | Compares the value to a text and picks one of two outcomes.                                                |
| [`urlencode`](#urlencode)       | Encoding          | Makes the value safe to put inside a URL.                                                                  |
| [`urldecode`](#urldecode)       | Encoding          | Reverts an URL encoded value.                                                                              |
| [`jsonescape`](#jsonescape)     | Encoding          | Makes the value safe to put inside a JSON text.                                                            |
| [`htmlescape`](#htmlescape)     | Encoding          | Makes the value safe to put inside HTML.                                                                   |
| [`base64`](#base64)             | Encoding          | Encodes the value to base 64.                                                                              |
| [`base64decode`](#base64decode) | Encoding          | Decodes a base 64 value.                                                                                   |
| [`user`](#user)                 | Values / Counters | Get the value of a speciifc user                                                                           |

## Text

### uppercase

_Also available as `upper`._

Converts the value to upper case.

```
{USER.uppercase} => DURSS
```

### lowercase

_Also available as `lower`._

Converts the value to lower case.

```
{USER.lowercase} => durss
```

### capitalize

Upper cases the first character. The rest of the value is left untouched so names like "McDonald" aren't mangled.

```
{USER.capitalize} => Durss
```

### titlecase

Upper cases the first character of every word. The rest of each word is left untouched.

```
{TITLE.titlecase} => Hello World
```

### trim

Removes the spaces before and after the value.

```
{MESSAGE.trim} => "hello"
```

### nospace

Removes every space of the value, not just the surrounding ones.

```
{USER.nospace} => JohnDoe
```

### reverse

Reverses the value. Emojis and accented characters are kept whole.

```
{USER.reverse} => ssruD
```

### length

Number of characters of the value. An emoji counts as one character.

```
{MESSAGE.length} => 12
```

### repeat

Repeats the value.

| Argument | Description                                                |
| -------- | ---------------------------------------------------------- |
| `count`  | How many times to repeat it. Defaults to 1, capped at 100. |

```
{EMOTE.repeat(3)} => KappaKappaKappa
```

### truncate

Shortens the value when it's too long and appends an ellipsis. Shorter values are returned untouched, without the ellipsis.

| Argument   | Description                                        |
| ---------- | -------------------------------------------------- |
| `size`     | Maximum number of characters. Defaults to 50.      |
| `ellipsis` | Appended when the value gets cut. Defaults to "…". |

```
{MESSAGE.truncate(10)} => Hello worl…
{MESSAGE.truncate(10, " [...]")} => Hello worl [...]
```

### left

Keeps only the first characters of the value.

| Argument | Description                                 |
| -------- | ------------------------------------------- |
| `count`  | How many characters to keep. Defaults to 0. |

```
{USER.left(3)} => Dur
```

### right

Keeps only the last characters of the value.

| Argument | Description                                 |
| -------- | ------------------------------------------- |
| `count`  | How many characters to keep. Defaults to 0. |

```
{USER.right(3)} => rss
```

### padstart

Pads the start of the value until it reaches the requested size. Handy to align values on an overlay.

| Argument | Description                                 |
| -------- | ------------------------------------------- |
| `size`   | Size to reach. Defaults to 0.               |
| `char`   | Character to pad with. Defaults to a space. |

```
{SCORE.padstart(5, 0)} => 00042
```

### padend

Pads the end of the value until it reaches the requested size.

| Argument | Description                                 |
| -------- | ------------------------------------------- |
| `size`   | Size to reach. Defaults to 0.               |
| `char`   | Character to pad with. Defaults to a space. |

```
{USER.padend(10, .)} => Durss.....
```

### replace

Replaces every occurrence of a text by another one. This is a plain text search, not a regular expression.

| Argument      | Description                                            |
| ------------- | ------------------------------------------------------ |
| `search`      | Text to search for. The value is untouched when empty. |
| `replacement` | Text to replace it with. Defaults to an empty text.    |

```
{MESSAGE.replace(hello, hi)} => hi world
```

### remove

Removes every occurrence of a text.

| Argument | Description                                        |
| -------- | -------------------------------------------------- |
| `search` | Text to remove. The value is untouched when empty. |

```
{MESSAGE.remove(spoiler)} => " alert"
```

### initials

Keeps the first letter of every word, upper cased.

```
{USER.initials} => JD
```

### deaccent

Removes the accents of the value. Mostly useful to make a value easier to read for a text to speech.

```
{USER.deaccent} => Francois
```

### stripemoji

Removes every emoji of the value. Strips pictographs along with the variation selector and zero width joiner.

```
{MESSAGE.stripemoji} => hello
```

### striphtml

Removes the HTML tags of the value.

```
{MESSAGE.striphtml} => hello
```

### nourl

Removes every link of the value.

```
{MESSAGE.nourl} => check this
```

### slug

Converts the value to a URL friendly text. Accents are removed and anything that isn't a letter or a digit becomes a dash.

```
{TITLE.slug} => my-stream-title
```

### mock

Alternates the case of every character, sPoNgEbOb style.

```
{MESSAGE.mock} => hElLo
```

### mask

Hides the end of the value behind a repeated character.

| Argument | Description                                                                  |
| -------- | ---------------------------------------------------------------------------- |
| `keep`   | How many characters to leave visible. Defaults to 0, which hides everything. |
| `char`   | Character to hide behind. Defaults to "\*".                                  |

```
{USER.mask(3)} => Dur**
{USER.mask(2, ?)} => Du???
```

## Numbers

### round

Rounds the number to the closest value.

| Argument   | Description                               |
| ---------- | ----------------------------------------- |
| `decimals` | How many decimals to keep. Defaults to 0. |

```
{AMOUNT.round} => 3
{AMOUNT.round(2)} => 3.14
```

### floor

Rounds the number down.

```
{AMOUNT.floor} => 3
```

### ceil

Rounds the number up.

```
{AMOUNT.ceil} => 4
```

### abs

Removes the sign of the number.

```
{AMOUNT.abs} => 42
```

### add

Adds a number to the value.

| Argument | Description                   |
| -------- | ----------------------------- |
| `amount` | Number to add. Defaults to 0. |

```
{COUNTER_POINTS.add(10)} => 15
```

### sub

Subtracts a number from the value.

| Argument | Description                        |
| -------- | ---------------------------------- |
| `amount` | Number to subtract. Defaults to 0. |

```
{COUNTER_POINTS.sub(10)} => 5
```

### mul

Multiplies the value by a number.

| Argument | Description                           |
| -------- | ------------------------------------- |
| `amount` | Number to multiply by. Defaults to 1. |

```
{COUNTER_POINTS.mul(2)} => 30
```

### div

Divides the value by a number. Dividing by 0 gives 0 rather than an error.

| Argument | Description                         |
| -------- | ----------------------------------- |
| `amount` | Number to divide by. Defaults to 1. |

```
{COUNTER_POINTS.div(2)} => 7.5
```

### min

Returns the smallest of the value and the given limit, which effectively caps the value to that limit.

| Argument | Description                      |
| -------- | -------------------------------- |
| `limit`  | Highest value that can come out. |

```
{VIEWERS.min(100)} => 100 when there are 250 viewers
```

### max

Returns the largest of the value and the given limit, which effectively raises the value up to that limit.

| Argument | Description                     |
| -------- | ------------------------------- |
| `limit`  | Lowest value that can come out. |

```
{VIEWERS.max(10)} => 10 when there are 3 viewers
```

### clamp

Keeps the value between two limits.

| Argument | Description                      |
| -------- | -------------------------------- |
| `min`    | Lowest value that can come out.  |
| `max`    | Highest value that can come out. |

```
{VIEWERS.clamp(1, 100)} => 100 when there are 250 viewers
```

### decimals

Forces a fixed number of decimals, adding trailing zeros if needed.

| Argument | Description                                             |
| -------- | ------------------------------------------------------- |
| `count`  | How many decimals to show. Defaults to 0, capped at 20. |

```
{AMOUNT.decimals(2)} => 5.00
```

### sign

Always shows the sign of the number, including the "+" of positives.

```
{DELTA.sign} => +5
```

### separator

Groups the digits of large numbers the way the current language does.

```
{FOLLOWERS.separator} => 1,234,567
```

### compact

Shortens large numbers. Great for follower or viewer counts.

```
{FOLLOWERS.compact} => 1.2M
```

### currency

Formats the number as an amount of money, the way the current language does. An unknown currency code gives the raw number back.

| Argument | Description                                        |
| -------- | -------------------------------------------------- |
| `code`   | Currency code, ex: EUR, USD, GBP. Defaults to USD. |

```
{AMOUNT.currency(EUR)} => €12.50
```

### ordinal

Turns the number into a rank, translated to the current language.

```
{RANK.ordinal} => 1st in english, 1er in french
```

### percent

Converts the value to a percentage of a total. The "%" sign isn't added so the result can be chained with another modifier such as round.

| Argument | Description                               |
| -------- | ----------------------------------------- |
| `total`  | Value representing 100%. Defaults to 100. |

```
{COUNTER_DONE.percent(50).round} => 40
```

## Date & duration

### duration

Converts a number of milliseconds to a readable duration. Only the units that are actually needed are shown, seconds always are.

```
{USER_FOLLOWAGE_MS.duration} => 1d 4h 12m 30s
```

### date

Converts a timestamp to a date, written the way the current language does.

```
{DATE_NOW.date} => 8/6/2026
```

### time

Converts a timestamp to a time of the day, written the way the current language does.

```
{DATE_NOW.time} => 4:35:02 PM
```

### datetime

Converts a timestamp to a date and a time, written the way the current language does.

```
{DATE_NOW.datetime} => 8/6/2026, 4:35:02 PM
```

### ago

Converts a timestamp to how long ago it was, translated to the current language. Future dates are supported too.

```
{USER_FOLLOWAGE.ago} => 2 years ago
```

## Lists

### first

First entry of a coma separated value.

```
{RAFFLE_WINNERS.first} => Alice
```

### last

Last entry of a coma separated value.

```
{RAFFLE_WINNERS.last} => Chloe
```

### nth

One specific entry of a coma separated value.

| Argument | Description                                          |
| -------- | ---------------------------------------------------- |
| `index`  | Position of the entry, starting at 1. Defaults to 1. |

```
{RAFFLE_WINNERS.nth(2)} => Bob
```

### count

How many entries a coma separated value holds.

```
{RAFFLE_WINNERS.count} => 3
```

### join

Rewrites a coma separated value with another separator.

| Argument    | Description                                        |
| ----------- | -------------------------------------------------- |
| `separator` | Text placed between the entries. Defaults to ", ". |

```
{RAFFLE_WINNERS.join(" | ")} => Alice | Bob | Chloe
```

### sort

Sorts the entries of a coma separated value alphabetically.

```
{RAFFLE_WINNERS.sort} => Alice, Bob, Chloe
```

### unique

Removes the duplicated entries of a coma separated value.

```
{CHATTERS.unique} => Alice, Bob
```

### shuffle

Randomizes the order of the entries of a coma separated value.

```
{CHATTERS.shuffle} => Bob, Chloe, Alice
```

### split

Cuts the value on a separator and keeps one of the chunks. Unlike the other list modifiers this one works with any separator.

| Argument    | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `separator` | Text to cut the value on. Defaults to ",".                   |
| `index`     | Position of the chunk to keep, starting at 1. Defaults to 1. |

```
{MESSAGE.split(" ", 2)} => world
```

## Logic

### default

Replaces the value by a fallback when it's empty. Saves having to add a condition to the trigger.

| Argument   | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| `fallback` | Text used when the value is empty. Defaults to an empty text. |

```
{USER.default(someone)} => someone
```

### bool

Converts a true/false value to your own words. "true", "1", "yes" and "on" all count as true, anything else is false.

| Argument  | Description                        |
| --------- | ---------------------------------- |
| `ifTrue`  | Text used when the value is true.  |
| `ifFalse` | Text used when the value is false. |

```
{USER_ROLE_SUB.bool(is a sub, is not a sub)} => is a sub
```

### plural

Picks the singular or the plural word matching the number. The value itself is replaced by the word, so write the number next to it. A value that isn't a number counts as 0.

| Argument   | Description                                     |
| ---------- | ----------------------------------------------- |
| `singular` | Word used when the value is 1 or -1.            |
| `plural`   | Word used otherwise.                            |
| `zero`     | Optional word used when the value is exactly 0. |

```
{VIEWERS} {VIEWERS.plural(viewer, viewers)} => 5 viewers
{VIEWERS.plural(viewer, viewers, nobody)} => nobody
```

### equals

Compares the value to a text and picks one of two outcomes. The comparison ignores the case and the surrounding spaces.

| Argument      | Description                                        |
| ------------- | -------------------------------------------------- |
| `compareTo`   | Text to compare the value to.                      |
| `ifEqual`     | Text used when both match.                         |
| `ifDifferent` | Text used otherwise. Defaults to the value itself. |

```
{MONTHS.equals(1, 1st time sub, resub)} => 1st time sub
```

## Encoding

### urlencode

Makes the value safe to put inside a URL.

```
{MESSAGE.urlencode} => hello%20world
```

### urldecode

Reverts an URL encoded value. Invalid values are left untouched.

```
{PARAM.urldecode} => hello world
```

### jsonescape

Makes the value safe to put inside a JSON text. The surrounding quotes aren't added. Note that the HTTP and websocket trigger actions already do this for you, this is only needed when building JSON by hand elsewhere.

```
{MESSAGE.jsonescape} => he said \"hi\"
```

### htmlescape

Makes the value safe to put inside HTML.

```
{MESSAGE.htmlescape} => &lt;b&gt;hi&lt;/b&gt;
```

### base64

Encodes the value to base 64.

```
{MESSAGE.base64} => aGVsbG8=
```

### base64decode

Decodes a base 64 value. Invalid values are left untouched.

```
{PAYLOAD.base64decode} => hello
```

### user

Gets the value of a per-user Counter of Value for a specific user.

```
{VALUE_MY-VALUE.user("Durss")} => durss's value
{COUNTER_VALUE_MY-COUNTER.user("Durss")} => durss's counter
```

You can also use placeholders:

```
{VALUE_MY-VALUE.user("{CUSTOM_USER}")} => custom user's value
```

A user ID can be given in place of the name

```
{VALUE_MY-VALUE.user("29961813")} => durss's value
```
