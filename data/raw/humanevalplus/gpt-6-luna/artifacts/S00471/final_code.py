def fruit_distribution(s, n):
    """
    Given a string containing the counts of apples and oranges and the total
    number of fruits in the basket, return the number of mangoes.

    For example, fruit_distribution("5 apples and 6 oranges", 19) returns 8.
    """
    counts = []
    current = ""
    for character in s:
        if character.isdigit():
            current += character
        elif current:
            counts.append(int(current))
            current = ""
    if current:
        counts.append(int(current))

    return n - sum(counts)
