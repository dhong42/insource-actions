# Run jq

Run jq on your data and get result as output


## Inputs
### `cmd`
**Required** This is the actual command that will be passed along

### `multiline`
Optional. Default `false`.

| Value | Behavior |
| - | - |
| true | Multiple lines of output will be captured. Useful for capturing lists. |
| false | Only the first line of the output will be captured. The rest will be written to stdout. |

## Outputs

### `value`
This is the actual result of the command executing

## Example usage

```yaml
uses: sergeysova/jq-action@v2
with:
  cmd: jq -n env
```

## Using output

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    
      - name: Extract version from package.json
        uses: sergeysova/jq-action@v2
        id: version
        with:
          cmd: 'jq .version package.json -r'
      
      - name: Show my version
        run: 'echo "version ${{ steps.version.outputs.value }}"'
```

## Using multiline output

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    
      - name: Extract all keywords from package.json
        uses: sergeysova/jq-action@v2
        id: keywords
        with:
          cmd: 'jq .keywords[] package.json -r'
          multiline: true
      
      - name: Show keywords
        run: |
          keywords="${{ steps.keywords.outputs.value }}"
          for keyword in $keywords; do
            echo "$keyword"
          done
```
