def by_length(arr):
    """
    Return names of integers from 1 through 9 in descending order.

    Ignore values outside that range and preserve duplicate occurrences.
    """
    names = ("One", "Two", "Three", "Four", "Five", "Six", "Seven",
             "Eight", "Nine")
    return [names[number - 1]
            for number in sorted((number for number in arr if 1 <= number <= 9),
                                 reverse=True)]
