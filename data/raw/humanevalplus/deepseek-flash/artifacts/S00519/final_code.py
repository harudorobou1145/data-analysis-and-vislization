
def get_max_triples(n):
    """
    You are given a positive integer n. You have to create an integer array a of length n.
        For each i (1 ≤ i ≤ n), the value of a[i] = i * i - i + 1.
        Return the number of triples (a[i], a[j], a[k]) of a where i < j < k, 
    and a[i] + a[j] + a[k] is a multiple of 3.

    Example :
        Input: n = 5
        Output: 1
        Explanation: 
        a = [1, 3, 7, 13, 21]
        The only valid triple is (1, 7, 13).
    """
    # Modulo 3, i*i - i + 1 is 1 when i % 3 != 2 and 0 when i % 3 == 2.
    # Therefore, a valid triple consists either of three values congruent
    # to 1, or of three values congruent to 0.
    zeros = (n + 1) // 3
    ones = n - zeros

    return zeros * (zeros - 1) * (zeros - 2) // 6 + \
           ones * (ones - 1) * (ones - 2) // 6
