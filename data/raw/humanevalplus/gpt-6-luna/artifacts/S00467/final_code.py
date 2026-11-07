def exchange(lst1, lst2):
    """Determine whether swaps can make every element of ``lst1`` even.

    Each odd element in ``lst1`` must be swapped with an even element from
    ``lst2``. Since the exchanged even element leaves ``lst2``, the number of
    available even elements there must be at least the number of odd elements
    in ``lst1``.
    """
    odd_count = sum(value % 2 != 0 for value in lst1)
    even_supply = sum(value % 2 == 0 for value in lst2)
    return "YES" if odd_count <= even_supply else "NO"
